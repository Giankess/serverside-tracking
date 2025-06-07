import winston from 'winston';

// Create a browser-safe logger
const isBrowser = typeof window !== 'undefined';

// Server-side logger
const serverLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  serverLogger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Browser-side logger
const browserLogger = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  debug: (...args: any[]) => console.debug('[DEBUG]', ...args)
};

// Export the appropriate logger based on environment
export const logger = isBrowser ? browserLogger : serverLogger; 