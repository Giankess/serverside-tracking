import { TrackingService } from '../services/TrackingService';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

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
  private trackingService: TrackingService;
  private static instance: DualTrackingManager;
  private processedEventIds: Set<string> = new Set();

  private constructor() {
    this.trackingService = new TrackingService();
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

      if (shouldSendToServer) {
        await this.trackServerSide({ ...event, eventId });
      }

      if (shouldSendToClient) {
        this.trackClientSide({ ...event, eventId });
      }

      // Store the event ID to prevent duplicates
      this.processedEventIds.add(eventId);
      
      // Clean up old event IDs periodically
      this.cleanupProcessedEventIds();
    } catch (error) {
      logger.error(`Error in dual tracking: ${error.message}`);
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

    await this.trackingService.trackEvent(serverEvent);
    logger.info(`Server-side event tracked: ${event.eventName} (ID: ${event.eventId})`);
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