import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// Add type definition for window.dataLayer
declare global {
  interface Window {
    dataLayer: any[];
  }
}

export interface DualTrackingEvent {
  eventName: string;
  userId?: string;
  sessionId?: string;
  properties: Record<string, any>;
  userProperties?: Record<string, any>;
  // Flag to control dual sending
  sendToServer?: boolean;
  sendToClient?: boolean;
  // Unique event ID for deduplication
  eventId?: string;
}

export class DualTrackingManager {
  private static instance: DualTrackingManager;
  private processedEventIds: Set<string> = new Set();
  private readonly trackingServerUrl: string;
  private readonly axiosInstance: ReturnType<typeof axios.create>;

  private constructor() {
    this.trackingServerUrl = process.env.NEXT_PUBLIC_TRACKING_SERVER_URL || 'http://localhost:3001';
    this.axiosInstance = axios.create({
      baseURL: this.trackingServerUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  static getInstance(): DualTrackingManager {
    if (!DualTrackingManager.instance) {
      DualTrackingManager.instance = new DualTrackingManager();
    }
    return DualTrackingManager.instance;
  }

  async trackEvent(event: DualTrackingEvent): Promise<void> {
    try {
      // Generate or use existing event ID
      const eventId = event.eventId || this.generateEventId();
      
      // Check if we've already processed this event
      if (this.processedEventIds.has(eventId)) {
        logger.warn(`Duplicate event detected: ${eventId}`);
        return;
      }

      // Default to sending to both if not specified
      const shouldSendToServer = event.sendToServer !== false;
      const shouldSendToClient = event.sendToClient !== false;

      const promises: Promise<void>[] = [];

      if (shouldSendToServer) {
        promises.push(this.trackServerSide({ ...event, eventId }));
      }

      if (shouldSendToClient) {
        this.trackClientSide({ ...event, eventId });
      }

      // Wait for all server-side tracking to complete
      await Promise.all(promises);

      // Store the event ID to prevent duplicates
      this.processedEventIds.add(eventId);
      
      // Clean up old event IDs periodically
      this.cleanupProcessedEventIds();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error in dual tracking: ${errorMessage}`);
      throw error;
    }
  }

  private async trackServerSide(event: DualTrackingEvent): Promise<void> {
    const serverEvent = {
      ...event,
      timestamp: Date.now(),
      sessionId: event.sessionId || this.generateSessionId(),
      // Add server-specific properties
      properties: {
        ...event.properties,
        tracking_source: 'server',
        server_timestamp: Date.now(),
        event_id: event.eventId // Include event ID in properties
      }
    };

    try {
      const response = await this.axiosInstance.post('/track', serverEvent);
      
      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      logger.info(`Server-side event tracked: ${event.eventName} (ID: ${event.eventId})`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(`Failed to track server-side event: ${error.message}`, {
          status: error.response?.status,
          data: error.response?.data
        });
      } else {
        logger.error(`Failed to track server-side event: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      throw error;
    }
  }

  private trackClientSide(event: DualTrackingEvent): void {
    // This will be picked up by GTM
    if (typeof window !== 'undefined' && window.dataLayer) {
      const clientEvent = {
        ...event,
        // Add client-specific properties
        properties: {
          ...event.properties,
          tracking_source: 'client',
          client_timestamp: Date.now(),
          event_id: event.eventId // Include event ID in properties
        }
      };

      window.dataLayer.push({
        event: event.eventName,
        ...clientEvent
      });
    }
  }

  private generateEventId(): string {
    return uuidv4();
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanupProcessedEventIds(): void {
    // Keep only the last 1000 event IDs to prevent memory leaks
    if (this.processedEventIds.size > 1000) {
      const idsToKeep = Array.from(this.processedEventIds).slice(-1000);
      this.processedEventIds = new Set(idsToKeep);
    }
  }
} 