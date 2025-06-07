import { logger } from './logger';

export interface GA4DeduplicationConfig {
  // Time window for deduplication in milliseconds
  deduplicationWindow: number;
  // Properties to use for deduplication
  deduplicationProperties: string[];
}

export class GA4DeduplicationHelper {
  private static readonly DEFAULT_DEDUPLICATION_WINDOW = 5 * 60 * 1000; // 5 minutes
  private static readonly DEFAULT_DEDUPLICATION_PROPERTIES = [
    'event_id',
    'user_id',
    'session_id'
  ];

  static getDeduplicationConfig(): GA4DeduplicationConfig {
    return {
      deduplicationWindow: this.DEFAULT_DEDUPLICATION_WINDOW,
      deduplicationProperties: this.DEFAULT_DEDUPLICATION_PROPERTIES
    };
  }

  static generateGTMDeduplicationRule(): string {
    return `
      // GA4 Deduplication Rule
      function() {
        return function(model) {
          var eventId = model.get('event_id');
          var userId = model.get('user_id');
          var sessionId = model.get('session_id');
          var timestamp = model.get('timestamp');
          
          // Create a unique key for deduplication
          var deduplicationKey = [eventId, userId, sessionId].filter(Boolean).join('_');
          
          // Check if we've seen this event recently
          var lastSeen = window._ga4DeduplicationMap[deduplicationKey];
          if (lastSeen && (timestamp - lastSeen) < ${this.DEFAULT_DEDUPLICATION_WINDOW}) {
            // Skip this event as it's a duplicate
            return false;
          }
          
          // Store the timestamp for this event
          window._ga4DeduplicationMap[deduplicationKey] = timestamp;
          
          // Clean up old entries
          this.cleanupDeduplicationMap();
          
          return true;
        };
      }
    `;
  }

  static generateGTMInitScript(): string {
    return `
      // Initialize GA4 deduplication
      window._ga4DeduplicationMap = {};
      
      // Clean up function for deduplication map
      function cleanupDeduplicationMap() {
        var now = Date.now();
        var window = ${this.DEFAULT_DEDUPLICATION_WINDOW};
        
        Object.keys(window._ga4DeduplicationMap).forEach(function(key) {
          if (now - window._ga4DeduplicationMap[key] > window) {
            delete window._ga4DeduplicationMap[key];
          }
        });
      }
    `;
  }

  static getGA4CustomDimensionConfig(): string {
    return `
      // GA4 Custom Dimension Configuration
      {
        "event_id": {
          "scope": "EVENT",
          "description": "Unique identifier for event deduplication"
        },
        "tracking_source": {
          "scope": "EVENT",
          "description": "Source of the tracking event (server/client)"
        }
      }
    `;
  }
} 