import axios from 'axios';
import { createClient } from 'redis';
import Bull from 'bull';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class TrackingService {
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

    // Add standard browser information if available
    if (event.request) {
      enrichedEvent.userAgent = event.request.headers['user-agent'];
      enrichedEvent.language = event.request.headers['accept-language']?.split(',')[0] || 'en-us';
      enrichedEvent.pageLocation = event.request.url;
      enrichedEvent.pageReferrer = event.request.headers.referer;
      
      // Extract GA4 cookies from request
      enrichedEvent.ga4Cookies = {
        _gclid: event.request.cookies?._gclid,
        _ga: event.request.cookies?._ga,
        _gid: event.request.cookies?._gid,
        _fbp: event.request.cookies?._fbp
      };
    }

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
    const timestamp = event.timestamp || Date.now();
    
    // Extract GA4 cookie values if available
    const ga4Cookies = event.ga4Cookies || {};
    
    // Get client ID from _ga cookie if available
    const clientId = ga4Cookies._ga?.split('.').slice(-2).join('.') || event.userId || 'anonymous';

    // Validate event name
    if (!event.eventName || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(event.eventName)) {
      throw new Error('Invalid event name. Must start with a letter and contain only alphanumeric characters and underscores.');
    }

    // Validate parameter count
    const params = {
      // Page/Session Information
      page_location: event.pageLocation || event.properties?.page_location,
      page_referrer: event.pageReferrer || event.properties?.page_referrer,
      page_title: event.pageTitle || event.properties?.page_title,
      screen_resolution: event.screenResolution || event.properties?.screen_resolution,
      language: event.language || event.properties?.language || 'en-us',
      
      // User Information
      user_agent: event.userAgent || event.properties?.user_agent,
      
      // Session Information
      session_id: event.sessionId || event.properties?.session_id,
      engagement_time_msec: event.engagementTime || event.properties?.engagement_time_msec || 100,
      
      // Traffic Source Information
      source: event.source || event.properties?.source,
      medium: event.medium || event.properties?.medium,
      campaign: event.campaign || event.properties?.campaign,
      
      // Device Information
      device_category: event.deviceCategory || event.properties?.device_category,
      mobile_device_model: event.mobileDeviceModel || event.properties?.mobile_device_model,
      mobile_device_branding: event.mobileDeviceBranding || event.properties?.mobile_device_branding,
      
      // GA4 Cookie Values
      gclid: ga4Cookies._gclid || event.properties?.gclid,
      _ga: ga4Cookies._ga || event.properties?._ga,
      _gid: ga4Cookies._gid || event.properties?._gid,
      _fbp: ga4Cookies._fbp || event.properties?._fbp,
      
      // Custom Parameters
      event_source: 'server_side',
      ...event.properties
    };

    // Remove any undefined values
    Object.keys(params).forEach(key => {
      if (params[key] === undefined) {
        delete params[key];
      }
    });

    // Validate parameter count (GA4 limit is 25)
    if (Object.keys(params).length > 25) {
      logger.warn('Event has more than 25 parameters, some will be dropped', {
        eventName: event.eventName,
        paramCount: Object.keys(params).length
      });
    }

    // Validate parameter name and value lengths
    Object.entries(params).forEach(([key, value]) => {
      if (key.length > 40) {
        throw new Error(`Parameter name '${key}' exceeds 40 characters`);
      }
      if (typeof value === 'string' && value.length > 100) {
        throw new Error(`Parameter value for '${key}' exceeds 100 characters`);
      }
    });
    
    return {
      client_id: clientId,
      user_id: event.userId,
      timestamp_micros: timestamp * 1000,
      non_personalized_ads: false,
      events: [{
        name: event.eventName,
        params: params
      }]
    };
  }

  async sendToGA4(event) {
    try {
      const measurementId = process.env.GA4_SERVER_MEASUREMENT_ID;
      const apiSecret = process.env.GA4_SERVER_API_SECRET;

      if (!measurementId || !apiSecret) {
        throw new Error('GA4 server-side configuration missing. Please set GA4_SERVER_MEASUREMENT_ID and GA4_SERVER_API_SECRET');
      }

      // Validate required fields
      if (!event.client_id) {
        throw new Error('client_id is required for GA4 events');
      }

      if (!event.events || !event.events.length) {
        throw new Error('At least one event is required');
      }

      // Add debug mode for testing
      const eventWithDebug = {
        ...event,
        debug_mode: true
      };

      // Log the complete request payload
      logger.info('Sending event to GA4 - Complete Payload:', {
        url: `https://region1.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
        payload: JSON.stringify(eventWithDebug, null, 2),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await axios.post(
        `https://region1.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
        JSON.stringify(eventWithDebug), // Explicitly stringify the body
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000 // 5 second timeout
        }
      );

      // Log the complete response
      logger.info('GA4 Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      });

      if (response.status !== 204) {
        throw new Error(`GA4 API error: ${response.status}`);
      }

      logger.info('Event sent to GA4 server-side property successfully', {
        eventName: event.events[0].name,
        clientId: event.client_id,
        timestamp: new Date(event.timestamp_micros / 1000).toISOString(),
        debugMode: true
      });
    } catch (error) {
      logger.error('Failed to send event to GA4 server-side property:', {
        error: error.message,
        eventName: event.events?.[0]?.name,
        clientId: event.client_id,
        response: error.response?.data,
        status: error.response?.status,
        debugMode: true,
        requestPayload: JSON.stringify(event, null, 2)
      });
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