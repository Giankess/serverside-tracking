import { useCallback, useEffect, useState } from 'react';
import { DualTrackingManager, DualTrackingEvent } from '../utils/dualTracking';
import { logger } from '../utils/logger';

export const useTracking = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const manager = DualTrackingManager.getInstance();
        setIsInitialized(true);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to initialize tracking');
        setError(error);
        logger.error('Failed to initialize tracking:', error);
      }
    };

    initialize();
  }, []);

  const trackEvent = useCallback(async (event: DualTrackingEvent) => {
    if (!isInitialized) {
      throw new Error('Tracking not initialized');
    }

    try {
      const trackingManager = DualTrackingManager.getInstance();
      await trackingManager.trackEvent(event);
    } catch (error) {
      logger.error('Error tracking event:', error);
      throw error;
    }
  }, [isInitialized]);

  const trackPageView = useCallback(async (pageData: {
    page: string;
    title?: string;
    url?: string;
    referrer?: string;
  }) => {
    if (!isInitialized) {
      throw new Error('Tracking not initialized');
    }

    try {
      await trackEvent({
        eventName: 'page_view',
        properties: {
          page: pageData.page,
          title: pageData.title || document.title,
          url: pageData.url || window.location.href,
          referrer: pageData.referrer || document.referrer
        },
        // Page views are typically better tracked client-side
        sendToServer: false,
        sendToClient: true
      });
    } catch (error) {
      logger.error('Error tracking page view:', error);
      throw error;
    }
  }, [trackEvent, isInitialized]);

  const trackEcommerceEvent = useCallback(async (eventData: {
    eventName: string;
    transactionId?: string;
    value?: number;
    currency?: string;
    items?: Array<{
      itemId: string;
      itemName: string;
      price: number;
      quantity: number;
    }>;
  }) => {
    if (!isInitialized) {
      throw new Error('Tracking not initialized');
    }

    try {
      await trackEvent({
        eventName: eventData.eventName,
        properties: {
          transaction_id: eventData.transactionId,
          value: eventData.value,
          currency: eventData.currency,
          items: eventData.items
        },
        // E-commerce events should be tracked both server and client-side
        sendToServer: true,
        sendToClient: true
      });
    } catch (error) {
      logger.error('Error tracking e-commerce event:', error);
      throw error;
    }
  }, [trackEvent, isInitialized]);

  return {
    trackEvent,
    trackPageView,
    trackEcommerceEvent,
    isInitialized,
    error
  };
}; 