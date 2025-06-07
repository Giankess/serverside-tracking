const { TrackingService } = require('../../services/TrackingService.js');
const { logger } = require('../../utils/logger.js');

let trackingService = null;
let initializationPromise = null;

async function initializeTrackingService() {
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    try {
      trackingService = await TrackingService.getInstance();
      logger.info('Tracking service initialized in cart API route');
    } catch (error) {
      logger.error('Failed to initialize tracking service in cart API route:', error);
      throw error;
    }
  })();

  return initializationPromise;
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Initialize tracking service if needed
    if (!trackingService) {
      await initializeTrackingService();
    }

    const { action, productId, productName, price, quantity } = req.body;

    if (!trackingService) {
      throw new Error('Tracking service not initialized');
    }

    switch (action) {
      case 'add_to_cart':
        await trackingService.trackEvent({
          eventName: 'add_to_cart',
          properties: {
            currency: 'USD',
            value: price * quantity,
            items: [{
              item_id: productId,
              item_name: productName,
              price: price,
              quantity: quantity
            }]
          }
        });
        break;

      case 'purchase':
        const transactionId = `T_${Date.now()}`;
        await trackingService.trackEvent({
          eventName: 'purchase',
          properties: {
            transaction_id: transactionId,
            value: price * quantity,
            currency: 'USD',
            items: [{
              item_id: productId,
              item_name: productName,
              price: price,
              quantity: quantity
            }]
          }
        });
        break;

      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error in cart API:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default handler; 