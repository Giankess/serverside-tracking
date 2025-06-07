import axios from 'axios';
import { createClient } from 'redis';
import Bull from 'bull';
import { logger } from '../utils/logger.js';

export interface TrackingEvent {
  eventName: string;
  properties: Record<string, any>;
  userId?: string;
  timestamp?: number;
  sessionId?: string;
  userProperties?: Record<string, any>;
}

export class TrackingService {
  private static instance: TrackingService;
  private redisClient: ReturnType<typeof createClient> | null = null;
  private queue: Bull.Queue | null = null;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('TrackingService can only be used on the server side');
    }
  }

  private async initialize() {
    if (this.isInitialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      try {
        // Initialize Redis client
        this.redisClient = createClient({
          url: process.env.REDIS_URL || 'redis://localhost:6379'
        });

        this.redisClient.on('error', (err) => {
          logger.error('Redis Client Error:', err);
        });

        await this.redisClient.connect();
        logger.info('Redis client connected successfully');

        // Initialize Bull queue
        this.queue = new Bull('tracking-events', {
          redis: {
            port: 6379,
            host: 'localhost'
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

        this.isInitialized = true;
        logger.info('TrackingService initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize TrackingService:', error);
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  public static async getInstance(): Promise<TrackingService> {
    if (!TrackingService.instance) {
      TrackingService.instance = new TrackingService();
      await TrackingService.instance.initialize();
    }
    return TrackingService.instance;
  }

  public async trackEvent(event: TrackingEvent): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.queue) {
        throw new Error('Queue not initialized');
      }

      // Enrich event with additional data
      const enrichedEvent = await this.enrichEvent(event);
      
      // Add to queue for processing
      await this.queue.add(enrichedEvent, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      });
    } catch (error) {
      logger.error('Error tracking event:', error);
      throw error;
    }
  }

  private async enrichEvent(event: TrackingEvent): Promise<TrackingEvent> {
    const enrichedEvent = { ...event };
    
    // Add timestamp if not present
    if (!enrichedEvent.timestamp) {
      enrichedEvent.timestamp = Date.now();
    }

    // Add user data if userId is present
    if (enrichedEvent.userId && this.redisClient) {
      const userData = await this.getUserData(enrichedEvent.userId);
      enrichedEvent.properties = {
        ...enrichedEvent.properties,
        ...userData
      };
    }

    return enrichedEvent;
  }

  private async processEvent(event: TrackingEvent): Promise<void> {
    try {
      // Transform event to GA4 format
      const ga4Event = this.transformToGA4(event);
      
      // Send to GA4
      await this.sendToGA4(ga4Event);
      
      // Store event in Redis for analytics
      if (this.redisClient) {
        await this.storeEvent(event);
      }
    } catch (error) {
      logger.error('Error processing event:', error);
      throw error;
    }
  }

  private transformToGA4(event: TrackingEvent): any {
    // Transform event to GA4 format
    return {
      client_id: event.userId || 'anonymous',
      events: [{
        name: event.eventName,
        params: event.properties
      }]
    };
  }

  private async sendToGA4(event: any): Promise<void> {
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

  private async storeEvent(event: TrackingEvent): Promise<void> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    const key = `event:${event.timestamp}:${event.eventName}`;
    await this.redisClient.set(key, JSON.stringify(event));
  }

  private async getUserData(userId: string): Promise<Record<string, any>> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    const key = `user:${userId}`;
    const userData = await this.redisClient.get(key);
    return userData ? JSON.parse(userData) : {};
  }
} 