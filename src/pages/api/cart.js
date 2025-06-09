import { TrackingService } from '../../services/TrackingService.js';
import { logger } from '../../utils/logger.js';

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

    // Extract GA4 cookies
    const ga4Cookies = {
      _gclid: req.cookies?._gclid,
      _ga: req.cookies?._ga,
      _gid: req.cookies?._gid,
      _fbp: req.cookies?._fbp
    };

    // Log the incoming request data
    logger.info('Cart API request received', {
      action,
      productId,
      productName,
      price,
      quantity,
      cookies: ga4Cookies,
      headers: {
        'x-client-id': req.headers['x-client-id'],
        'user-agent': req.headers['user-agent']
      }
    });

    switch (action) {
      case 'add_to_cart':
        const addToCartEvent = {
          eventName: 'add_to_cart',
          userId: req.headers['x-client-id'] || 'anonymous',
          sessionId: `sess_${Date.now()}`,
          timestamp: Date.now(),
          properties: {
            currency: 'USD',
            value: price * quantity,
            items: [{
              item_id: productId,
              item_name: productName,
              price: price,
              quantity: quantity
            }],
            engagement_time_msec: 100,
            session_id: `sess_${Date.now()}`,
            page_location: req.headers.referer || 'unknown',
            page_referrer: req.headers.referer || 'unknown',
            user_agent: req.headers['user-agent'] || 'unknown'
          },
          ga4Cookies
        };

        logger.logTrackingEvent(addToCartEvent);
        await trackingService.trackEvent(addToCartEvent);
        break;

      case 'purchase':
        const transactionId = `T_${Date.now()}`;
        const purchaseEvent = {
          eventName: 'purchase',
          userId: req.headers['x-client-id'] || 'anonymous',
          sessionId: `sess_${Date.now()}`,
          timestamp: Date.now(),
          properties: {
            transaction_id: transactionId,
            value: price * quantity,
            currency: 'USD',
            items: [{
              item_id: productId,
              item_name: productName,
              price: price,
              quantity: quantity
            }],
            engagement_time_msec: 100,
            session_id: `sess_${Date.now()}`,
            page_location: req.headers.referer || 'unknown',
            page_referrer: req.headers.referer || 'unknown',
            user_agent: req.headers['user-agent'] || 'unknown'
          },
          ga4Cookies
        };

        logger.logTrackingEvent(purchaseEvent);
        await trackingService.trackEvent(purchaseEvent);
        break;

      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error in cart API', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      headers: req.headers,
      cookies: req.cookies
    });
    
    // Send a more detailed error response
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Export the handler as default for Next.js API routes
export default handler; 