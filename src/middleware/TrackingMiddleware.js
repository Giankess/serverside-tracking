const { TrackingService } = require('../services/TrackingService.js');
const { logger } = require('../utils/logger.js');

class TrackingMiddleware {
  constructor() {
    this.trackingService = null;
    this.initializationPromise = null;
    this.initialize();
  }

  async initialize() {
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      try {
        this.trackingService = await TrackingService.getInstance();
        logger.info('TrackingMiddleware initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize TrackingMiddleware:', error);
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  handleServerSideEvent = async (req, res, next) => {
    try {
      if (!this.trackingService) {
        await this.initialize();
        if (!this.trackingService) {
          throw new Error('Failed to initialize tracking service');
        }
      }

      // Extract client ID and cookies from request
      const clientId = this.getClientId(req);
      const ga4Cookies = this.getGA4Cookies(req);
      
      // If this is a server-side event, process it
      if (req.headers['x-tracking-source'] === 'server') {
        const event = {
          eventName: req.body.eventName,
          userId: req.body.userId || clientId,
          sessionId: req.body.sessionId || this.generateSessionId(),
          timestamp: Date.now(),
          properties: req.body.properties || {},
          userProperties: req.body.userProperties || {},
          ga4Cookies: ga4Cookies
        };

        await this.trackingService.trackEvent(event);
        logger.info(`Server-side event tracked: ${event.eventName}`);
      }

      // Add client ID and cookies to response for client-side tracking
      res.setHeader('X-Client-ID', clientId);
      
      next();
    } catch (error) {
      logger.error('Error in tracking middleware:', error);
      next();
    }
  };

  // Middleware to inject GTM configuration
  injectGTMConfig = (req, res, next) => {
    const gtmConfig = {
      gtmId: process.env.GTM_ID,
      dataLayer: {
        clientId: this.getClientId(req),
        serverTimestamp: Date.now(),
        environment: process.env.NODE_ENV
      }
    };

    // Inject GTM config into response
    res.locals.gtmConfig = gtmConfig;
    next();
  };

  getGA4Cookies(req) {
    return {
      _gclid: req.cookies?._gclid,
      _ga: req.cookies?._ga,
      _gid: req.cookies?._gid,
      _fbp: req.cookies?._fbp
    };
  }

  getClientId(req) {
    // Try to get client ID from various sources in order of preference
    return (
      req.headers['x-client-id'] ||
      req.cookies?._ga?.split('.').slice(-2).join('.') ||
      this.generateClientId()
    );
  }

  generateClientId() {
    return `GA1.2.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = { TrackingMiddleware }; 