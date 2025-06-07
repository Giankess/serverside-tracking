import { useCallback } from 'react';
import { DualTrackingManager, DualTrackingEvent } from '../utils/dualTracking';

export const useTracking = () => {
  const trackEvent = useCallback(async (event: DualTrackingEvent) => {
    const trackingManager = DualTrackingManager.getInstance();
    await trackingManager.trackEvent(event);
  }, []);

  const trackPageView = useCallback(async (pageData: {
    page: string;
    title?: string;
    url?: string;
    referrer?: string;
  }) => {
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
  }, [trackEvent]);

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
  }, [trackEvent]);

  return {
    trackEvent,
    trackPageView,
    trackEcommerceEvent
  };
}; 