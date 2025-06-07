const { useEffect, useCallback } = require('react');
const { logger } = require('../utils/logger.js');

function useTracking() {
  const trackEvent = useCallback((eventName, properties = {}) => {
    try {
      if (typeof window !== 'undefined' && window.dataLayer) {
        window.dataLayer.push({
          event: eventName,
          ...properties
        });
        logger.info(`Event tracked: ${eventName}`, properties);
      } else {
        logger.warn('dataLayer not available for tracking');
      }
    } catch (error) {
      logger.error('Error tracking event:', error);
    }
  }, []);

  const trackPageView = useCallback((pageData = {}) => {
    try {
      if (typeof window !== 'undefined' && window.dataLayer) {
        window.dataLayer.push({
          event: 'page_view',
          page: {
            path: window.location.pathname,
            title: document.title,
            ...pageData
          }
        });
        logger.info('Page view tracked:', pageData);
      } else {
        logger.warn('dataLayer not available for tracking');
      }
    } catch (error) {
      logger.error('Error tracking page view:', error);
    }
  }, []);

  useEffect(() => {
    // Track initial page view
    trackPageView();
  }, [trackPageView]);

  return {
    trackEvent,
    trackPageView
  };
}

module.exports = { useTracking }; 