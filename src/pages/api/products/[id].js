import { products } from '../../../data/products.js';
import { TrackingService } from '../../../services/TrackingService.js';
import { logger } from '../../../utils/logger.js';

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
  // Set proper headers
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const { id } = req.query;
    logger.info('Individual product API called:', { id });
    
    if (req.method !== 'GET') {
      logger.warn('Invalid method:', req.method);
      return res.status(405).json({ 
        success: false,
        error: 'Method not allowed' 
      });
    }

    if (!id) {
      logger.error('No product ID provided');
      return res.status(400).json({ 
        success: false,
        error: 'Product ID is required' 
      });
    }

    logger.info('Products data:', { count: products?.length, isArray: Array.isArray(products) });
    
    if (!products || !Array.isArray(products)) {
      logger.error('Products data is not properly initialized');
      return res.status(500).json({ 
        success: false,
        error: 'Products data is not available'
      });
    }

    const product = products.find(p => p.id === id);
    logger.info('Product search result:', { found: !!product, id });

    if (!product) {
      logger.warn(`Product not found with id: ${id}`);
      return res.status(404).json({ 
        success: false,
        error: 'Product not found'
      });
    }

    // Initialize tracking service if needed
    if (!trackingService) {
      await initializeTrackingService();
    }

    // Track view event if tracking service is available
    if (trackingService) {
      try {
        const eventId = await trackingService.trackEvent({
          eventName: 'view_item',
          properties: {
            item_id: product.id,
            item_name: product.name,
            price: product.price,
            currency: 'USD',
            item_category: product.category
          }
        });
        logger.info('View item event tracked successfully', { eventId });
        
        // Add event ID to response
        return res.status(200).json({ 
          success: true,
          product,
          eventId
        });
      } catch (trackingError) {
        logger.error('Failed to track view item event:', trackingError);
        // Don't fail the request if tracking fails
        return res.status(200).json({ 
          success: true,
          product
        });
      }
    }

    logger.info(`Successfully fetched product with id: ${id}`);
    return res.status(200).json({ 
      success: true,
      product
    });
  } catch (error) {
    logger.error('Error fetching product:', error);
    return res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch product'
    });
  }
}

// Export the handler as default for Next.js API routes
export default handler; 