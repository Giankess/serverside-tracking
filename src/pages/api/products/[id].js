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
      logger.info('Tracking service initialized in product API route');
    } catch (error) {
      logger.error('Failed to initialize tracking service in product API route:', error);
      throw error;
    }
  })();

  return initializationPromise;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { id } = req.query;
    const product = products.find(p => p.id === id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    try {
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
            item_category: product.category
          }
        });
      }

      // Simulate API delay
      setTimeout(() => {
        res.status(200).json(product);
      }, 500);
    } catch (error) {
      logger.error('Error in product API:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
} 