import axios from 'axios';
import { createClient } from 'redis';
import Bull from 'bull';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

class TrackingService {
  static instance = null;
  redisClient = null;
  queue = null;
  isInitialized = false;
  initializationPromise = null;
  reconnectAttempts = 0;
  maxReconnectAttempts = 3; // Reduced for serverless environment

  constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('TrackingService can only be used on the server side');
    }
  }

  async initialize() {
    if (this.isInitialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      try {
        // Initialize Redis client only if REDIS_URL is available
        if (process.env.REDIS_URL) {
          try {
            this.redisClient = createClient({
              url: process.env.REDIS_URL,
              socket: {
                connectTimeout: 5000, // 5 second timeout
                reconnectStrategy: (retries) => {
                  if (retries > this.maxReconnectAttempts) {
                    logger.warn('Max Redis reconnection attempts reached, continuing without Redis');
                    return false; // Stop trying to reconnect
                  }
                  const delay = Math.min(retries * 1000, 3000);
                  logger.info(`Redis reconnecting in ${delay}ms...`);
                  return delay;
                }
              }
            });

            this.redisClient.on('error', (err) => {
              logger.error('Redis Client Error:', err);
              this.handleRedisError(err);
            });

            this.redisClient.on('connect', () => {
              logger.info('Redis client connected successfully');
              this.reconnectAttempts = 0;
            });

            // Set a timeout for the connection attempt
            const connectionPromise = this.redisClient.connect();
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Redis connection timeout')), 5000);
            });

            await Promise.race([connectionPromise, timeoutPromise]);
            logger.info('Redis client connected successfully');

            // Initialize Bull queue only if Redis is available
            this.queue = new Bull('tracking-events', {
              redis: {
                url: process.env.REDIS_URL,
                maxRetriesPerRequest: 2,
                enableReadyCheck: true
              }
            });

            // Process queue
            this.queue.process(async (job) => {
              try {
                const event = job.data;
                await this.processEvent(event);
                return { success: true };
              } catch (error) {
                logger.error('Error processing event:', error);
                throw error;
              }
            });

            // Handle completed jobs
            this.queue.on('completed', (job) => {
              logger.info(`Job ${job.id} completed`);
            });

            // Handle failed jobs
            this.queue.on('failed', (job, error) => {
              logger.error(`Job ${job?.id} failed:`, error);
            });

            // Handle queue errors
            this.queue.on('error', (error) => {
              logger.error('Queue error:', error);
              this.handleRedisError(error);
            });
          } catch (redisError) {
            logger.warn('Failed to initialize Redis, continuing without Redis:', redisError);
            this.redisClient = null;
            this.queue = null;
          }
        } else {
          logger.warn('Redis URL not provided, running in serverless mode without queue');
        }

        this.isInitialized = true;
        logger.info('TrackingService initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize TrackingService:', error);
        // Don't throw the error, just log it and continue without Redis
        this.redisClient = null;
        this.queue = null;
        this.isInitialized = true;
      }
    })();

    return this.initializationPromise;
  }

  async handleRedisError(error) {
    logger.error('Redis error occurred:', error);
    
    // If Redis is down, switch to immediate processing
    if (this.queue) {
      logger.warn('Switching to immediate event processing due to Redis issues');
      this.queue = null;
    }
  }

  static async getInstance() {
    if (!TrackingService.instance) {
      TrackingService.instance = new TrackingService();
      await TrackingService.instance.initialize();
    }
    return TrackingService.instance;
  }

  async trackEvent(event) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Generate event ID if not provided
      if (!event.eventId) {
        event.eventId = `evt_${uuidv4()}`;
      }

      // Enrich event with additional data
      const enrichedEvent = await this.enrichEvent(event);
      
      // If queue is available, add to queue
      if (this.queue) {
        try {
          await this.queue.add(enrichedEvent, {
            attempts: 2,
            backoff: {
              type: 'exponential',
              delay: 1000
            }
          });
        } catch (queueError) {
          logger.warn('Failed to add event to queue, processing immediately:', queueError);
          await this.processEvent(enrichedEvent);
        }
      } else {
        // If no queue, process immediately
        await this.processEvent(enrichedEvent);
      }

      // Return the event ID for client-side tracking
      return event.eventId;
    } catch (error) {
      logger.error('Error tracking event:', error);
      // Still return the event ID even if tracking fails
      return event.eventId;
    }
  }

  async enrichEvent(event) {
    const enrichedEvent = { ...event };
    
    // Add timestamp if not present
    if (!enrichedEvent.timestamp) {
      enrichedEvent.timestamp = Date.now();
    }

    // Add user data if userId is present and Redis is available
    if (enrichedEvent.userId && this.redisClient) {
      const userData = await this.getUserData(enrichedEvent.userId);
      enrichedEvent.properties = {
        ...enrichedEvent.properties,
        ...userData
      };
    }

    // Add event ID to properties for GA4
    enrichedEvent.properties = {
      ...enrichedEvent.properties,
      event_id: enrichedEvent.eventId
    };

    return enrichedEvent;
  }

  async processEvent(event) {
    try {
      // Transform event to GA4 format
      const ga4Event = this.transformToGA4(event);
      
      // Send to GA4
      await this.sendToGA4(ga4Event);
      
      // Store event in Redis if available
      if (this.redisClient) {
        await this.storeEvent(event);
      }
    } catch (error) {
      logger.error('Error processing event:', error);
      throw error;
    }
  }

  transformToGA4(event) {
    // Transform event to GA4 format
    return {
      client_id: event.userId || 'anonymous',
      events: [{
        name: event.eventName,
        params: {
          ...event.properties,
          event_source: 'server_side' // Add custom parameter to identify server-side events
        }
      }]
    };
  }

  async sendToGA4(event) {
    try {
      const measurementId = process.env.GA4_MEASUREMENT_ID;
      const apiSecret = process.env.GA4_API_SECRET;

      if (!measurementId || !apiSecret) {
        throw new Error('GA4 configuration missing');
      }

      const response = await axios.post(
        `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
        event
      );

      if (response.status !== 204) {
        throw new Error(`GA4 API error: ${response.status}`);
      }

      logger.info('Event sent to GA4 successfully');
    } catch (error) {
      logger.error('Failed to send event to GA4:', error);
      throw error;
    }
  }

  async storeEvent(event) {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    const key = `event:${event.timestamp}:${event.eventName}`;
    await this.redisClient.set(key, JSON.stringify(event));
  }

  async getUserData(userId) {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    const key = `user:${userId}`;
    const userData = await this.redisClient.get(key);
    return userData ? JSON.parse(userData) : {};
  }
}

export { TrackingService }; 