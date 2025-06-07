const { TrackingService } = require('../services/TrackingService.js');
const { logger } = require('../utils/logger.js');

class EcommerceEventHandler {
  constructor() {
    this.trackingService = null;
    this.initializationPromise = null;
    this.initialize();
  }

  async initialize() {
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      try {
        this.trackingService = await TrackingService.getInstance();
        logger.info('EcommerceEventHandler initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize EcommerceEventHandler:', error);
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  async handlePurchase(userId, purchaseData) {
    try {
      if (!this.trackingService) {
        await this.initialize();
        if (!this.trackingService) {
          throw new Error('Failed to initialize tracking service');
        }
      }

      const event = {
        eventName: 'purchase',
        userId,
        sessionId: this.generateSessionId(),
        timestamp: Date.now(),
        properties: {
          transaction_id: purchaseData.transactionId,
          value: purchaseData.value,
          currency: purchaseData.currency,
          items: purchaseData.items
        },
        userProperties: {
          last_purchase_date: new Date().toISOString(),
          total_purchases: await this.getUserPurchaseCount(userId)
        }
      };

      await this.trackingService.trackEvent(event);
      logger.info(`Purchase event tracked for user ${userId}`);
    } catch (error) {
      logger.error('Failed to track purchase event:', error);
      throw error;
    }
  }

  async handleAddToCart(userId, cartData) {
    try {
      if (!this.trackingService) {
        await this.initialize();
        if (!this.trackingService) {
          throw new Error('Failed to initialize tracking service');
        }
      }

      const event = {
        eventName: 'add_to_cart',
        userId,
        sessionId: this.generateSessionId(),
        timestamp: Date.now(),
        properties: {
          item_id: cartData.itemId,
          item_name: cartData.itemName,
          price: cartData.price,
          quantity: cartData.quantity
        },
        userProperties: {
          last_cart_update: new Date().toISOString()
        }
      };

      await this.trackingService.trackEvent(event);
      logger.info(`Add to cart event tracked for user ${userId}`);
    } catch (error) {
      logger.error('Failed to track add to cart event:', error);
      throw error;
    }
  }

  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getUserPurchaseCount(userId) {
    // In a real implementation, this would query your database
    // For this example, we'll return a mock value
    return 1;
  }
}

module.exports = { EcommerceEventHandler }; 