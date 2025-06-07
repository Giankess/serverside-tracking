import { TrackingService } from '../../services/TrackingService.js';
import { logger } from '../../utils/logger.js';

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

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }

  try {
    if (!trackingService) {
      await initializeTrackingService();
      if (!trackingService) {
        throw new Error('Failed to initialize tracking service');
      }
    }

    const event = req.body;
    await trackingService.trackEvent(event);
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error tracking event:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Export the handler as default for Next.js API routes
export default handler;