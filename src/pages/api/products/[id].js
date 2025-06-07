const { products } = require('../../../data/products.js');
const { TrackingService } = require('../../../services/TrackingService.js');
const { logger } = require('../../../utils/logger.js');

let trackingService = null;
let initializationPromise = null;

async function initializeTrackingService() {
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    try {
      trackingService = await TrackingService.getInstance();
      logger.info('Tracking service initialized in product API route');
    } catch (error) {
      logger.error('Failed to initialize tracking service in product API route:', error);
      throw error;
    }
  })();

  return initializationPromise;
}

async function handler(req, res) {
  if (req.method === 'GET') {
    const { id } = req.query;
    
    try {
      if (!products || !Array.isArray(products)) {
        throw new Error('Products data is not properly initialized');
      }

      const product = products.find(p => p.id === id);

      if (!product) {
        logger.warn(`Product not found with id: ${id}`);
        return res.status(404).json({ message: 'Product not found' });
      }

      // Initialize tracking service if needed
      if (!trackingService) {
        await initializeTrackingService();
      }

      // Track view_item event server-side
      if (trackingService) {
        await trackingService.trackEvent({
          eventName: 'view_item',
          properties: {
            item_id: product.id,
            item_name: product.name,
            price: product.price,
            item_category: product.category,
            currency: 'USD'
          }
        });
        logger.info(`View item event tracked for product ${product.id}`);
      }

      // Return product data
      return res.status(200).json(product);
    } catch (error) {
      logger.error('Error in product API:', error);
      return res.status(500).json({ 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}

module.exports = handler; 