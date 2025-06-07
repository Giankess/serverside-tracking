import { Request, Response, NextFunction } from 'express';
import { TrackingService } from '../services/TrackingService';
import { logger } from '../utils/logger';

export class TrackingMiddleware {
  private trackingService: TrackingService;

  constructor() {
    this.trackingService = new TrackingService();
  }

  handleServerSideEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract client ID from request headers or cookies
      const clientId = this.getClientId(req);
      
      // If this is a server-side event, process it
      if (req.headers['x-tracking-source'] === 'server') {
        const event = {
          eventName: req.body.eventName,
          userId: req.body.userId || clientId,
          sessionId: req.body.sessionId || this.generateSessionId(),
          timestamp: Date.now(),
          properties: req.body.properties || {},
          userProperties: req.body.userProperties || {}
        };

        await this.trackingService.trackEvent(event);
        logger.info(`Server-side event tracked: ${event.eventName}`);
      }

      // Add client ID to response for client-side tracking
      res.setHeader('X-Client-ID', clientId);
      
      next();
    } catch (error) {
      logger.error(`Error in tracking middleware: ${error.message}`);
      next();
    }
  };

  // Middleware to inject GTM configuration
  injectGTMConfig = (req: Request, res: Response, next: NextFunction) => {
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

  private getClientId(req: Request): string {
    // Try to get client ID from various sources
    return (
      req.headers['x-client-id'] ||
      req.cookies['_ga']?.split('.').slice(-2).join('.') ||
      this.generateClientId()
    );
  }

  private generateClientId(): string {
    return `GA1.2.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 