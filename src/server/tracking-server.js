const express = require('express');
const cors = require('cors');
const { TrackingService } = require('../services/TrackingService.js');
const { logger } = require('../utils/logger.js');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize tracking service
let trackingService = null;

async function initializeTrackingService() {
  try {
    trackingService = await TrackingService.getInstance();
    logger.info('Tracking service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize tracking service:', error);
    process.exit(1);
  }
}

// Routes
app.post('/track', async (req, res) => {
  try {
    if (!trackingService) {
      throw new Error('Tracking service not initialized');
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
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    trackingService: trackingService ? 'initialized' : 'not initialized'
  });
});

// Start server
async function startServer() {
  try {
    await initializeTrackingService();
    
    app.listen(port, () => {
      logger.info(`Tracking server listening on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer(); 