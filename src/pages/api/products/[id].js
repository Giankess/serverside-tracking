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
      logger.info('Tracking service initialized in API route');
    } catch (error) {
      logger.error('Failed to initialize tracking service in API route:', error);
      throw error;
    }
  })();

  return initializationPromise;
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    if (!products || !Array.isArray(products)) {
      logger.error('Products data is not properly initialized');
      return res.status(500).json({ 
        error: 'Products data is not available',
        success: false
      });
    }

    const { id } = req.query;
    const product = products.find(p => p.id === id);

    if (!product) {
      logger.warn(`Product not found with id: ${id}`);
      return res.status(404).json({ 
        error: 'Product not found',
        success: false
      });
    }

    if (!trackingService) {
      await initializeTrackingService();
    }

    if (trackingService) {
      await trackingService.trackEvent({
        type: 'view_item',
        productId: product.id,
        productName: product.name,
        price: product.price
      });
    }

    logger.info(`Successfully fetched product with id: ${id}`);
    return res.status(200).json({ 
      product,
      success: true
    });
  } catch (error) {
    logger.error('Error fetching product:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch product',
      success: false
    });
  }
}

module.exports = handler; 