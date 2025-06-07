import { TrackingService } from '../../services/TrackingService.js';
import { logger } from '../../utils/logger.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const trackingService = await TrackingService.getInstance();
    
    // Test event
    const testEvent = {
      eventName: 'test_event',
      properties: {
        test_property: 'test_value',
        timestamp: new Date().toISOString()
      }
    };

    // Track the event
    await trackingService.trackEvent(testEvent);
    
    logger.info('Test event tracked successfully', testEvent);
    
    res.status(200).json({
      success: true,
      message: 'Test event tracked successfully',
      event: testEvent
    });
  } catch (error) {
    logger.error('Error tracking test event:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export default handler; 