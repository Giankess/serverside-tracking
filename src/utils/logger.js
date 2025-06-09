import winston from 'winston';

// Create a format that works in both development and production
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create a console transport that works well with Vercel
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(({ level, message, timestamp, ...metadata }) => {
      let msg = `${timestamp} [${level}]: ${message}`;
      if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata, null, 2)}`;
      }
      return msg;
    })
  )
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { 
    service: 'ecommerce-tracking',
    environment: process.env.NODE_ENV,
    deployment: process.env.VERCEL_ENV || 'development'
  },
  transports: [consoleTransport]
});

// Add error handling
logger.on('error', (error) => {
  console.error('Logger error:', error);
});

// Add a method to log API requests
logger.logApiRequest = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('API Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers['user-agent'],
      clientId: req.headers['x-client-id'],
      cookies: {
        _ga: req.cookies?._ga,
        _gclid: req.cookies?._gclid
      }
    });
  });
  next();
};

// Add a method to log tracking events
logger.logTrackingEvent = (event) => {
  logger.info('Tracking Event', {
    eventName: event.eventName,
    userId: event.userId,
    sessionId: event.sessionId,
    properties: event.properties,
    ga4Cookies: event.ga4Cookies
  });
};

export { logger }; 