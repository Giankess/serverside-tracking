import axios from 'axios';
import { Queue, Worker } from 'bull';
import Redis from 'redis';
import { logger } from '../utils/logger';

export interface TrackingEvent {
  eventName: string;
  userId: string;
  sessionId: string;
  timestamp: number;
  properties: Record<string, any>;
  userProperties: Record<string, any>;
}

export class TrackingService {
  private readonly ga4MeasurementId: string;
  private readonly apiSecret: string;
  private readonly eventQueue: Queue;
  private readonly redisClient: Redis.RedisClient;

  constructor() {
    this.ga4MeasurementId = process.env.GA4_MEASUREMENT_ID || '';
    this.apiSecret = process.env.GA4_API_SECRET || '';
    
    // Initialize Redis client
    this.redisClient = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    // Initialize event queue
    this.eventQueue = new Queue('tracking-events', {
      redis: {
        port: 6379,
        host: 'localhost'
      }
    });

    this.setupQueueProcessor();
  }

  private setupQueueProcessor() {
    const worker = new Worker('tracking-events', async (job) => {
      const event = job.data as TrackingEvent;
      await this.processEvent(event);
    });

    worker.on('completed', (job) => {
      logger.info(`Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`Job ${job.id} failed: ${err.message}`);
    });
  }

  async trackEvent(event: TrackingEvent): Promise<void> {
    // Enrich event with additional data
    const enrichedEvent = await this.enrichEvent(event);
    
    // Add to queue for processing
    await this.eventQueue.add(enrichedEvent, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      }
    });
  }

  private async enrichEvent(event: TrackingEvent): Promise<TrackingEvent> {
    // Add server-side enrichment
    const enrichedEvent = {
      ...event,
      properties: {
        ...event.properties,
        serverTimestamp: Date.now(),
        environment: process.env.NODE_ENV
      }
    };

    // Add user data from Redis if available
    const userData = await this.getUserData(event.userId);
    if (userData) {
      enrichedEvent.userProperties = {
        ...enrichedEvent.userProperties,
        ...userData
      };
    }

    return enrichedEvent;
  }

  private async processEvent(event: TrackingEvent): Promise<void> {
    try {
      const ga4Payload = this.transformToGA4Format(event);
      
      await axios.post(
        `https://www.google-analytics.com/mp/collect?measurement_id=${this.ga4MeasurementId}&api_secret=${this.apiSecret}`,
        ga4Payload
      );

      // Store user data in Redis for future enrichment
      await this.storeUserData(event.userId, event.userProperties);
      
      logger.info(`Successfully processed event: ${event.eventName}`);
    } catch (error) {
      logger.error(`Failed to process event: ${error.message}`);
      throw error;
    }
  }

  private transformToGA4Format(event: TrackingEvent): any {
    return {
      client_id: event.userId,
      user_id: event.userId,
      events: [{
        name: event.eventName,
        params: {
          ...event.properties,
          session_id: event.sessionId,
          timestamp_micros: event.timestamp * 1000
        }
      }],
      user_properties: Object.entries(event.userProperties).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: { value }
      }), {})
    };
  }

  private async getUserData(userId: string): Promise<Record<string, any> | null> {
    return new Promise((resolve, reject) => {
      this.redisClient.get(`user:${userId}`, (err, data) => {
        if (err) reject(err);
        resolve(data ? JSON.parse(data) : null);
      });
    });
  }

  private async storeUserData(userId: string, userData: Record<string, any>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.redisClient.set(
        `user:${userId}`,
        JSON.stringify(userData),
        'EX',
        30 * 24 * 60 * 60, // 30 days expiry
        (err) => {
          if (err) reject(err);
          resolve();
        }
      );
    });
  }
} 