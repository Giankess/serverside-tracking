import { TrackingService, TrackingEvent } from '../services/TrackingService';
import { logger } from '../utils/logger';

export class EcommerceEventHandler {
  private trackingService: TrackingService;

  constructor() {
    this.trackingService = new TrackingService();
  }

  async handlePurchase(userId: string, purchaseData: {
    transactionId: string;
    value: number;
    currency: string;
    items: Array<{
      itemId: string;
      itemName: string;
      price: number;
      quantity: number;
    }>;
  }): Promise<void> {
    try {
      const event: TrackingEvent = {
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
      logger.error(`Failed to track purchase event: ${error.message}`);
      throw error;
    }
  }

  async handleAddToCart(userId: string, cartData: {
    itemId: string;
    itemName: string;
    price: number;
    quantity: number;
  }): Promise<void> {
    try {
      const event: TrackingEvent = {
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
      logger.error(`Failed to track add to cart event: ${error.message}`);
      throw error;
    }
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getUserPurchaseCount(userId: string): Promise<number> {
    // In a real implementation, this would query your database
    // For this example, we'll return a mock value
    return 1;
  }
} 