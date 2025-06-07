import { TrackingService } from '../../services/TrackingService.js';
import { logger } from '../../utils/logger.js';

async function handler(req, res) {
  try {
    const trackingService = await TrackingService.getInstance();
    const redisStatus = trackingService.redisClient ? 'connected' : 'not configured';
    
    res.status(200).json({
      status: 'ok',
      redis: redisStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

export default handler; 