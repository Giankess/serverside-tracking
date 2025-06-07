# Server-Side E-commerce Tracking

A robust server-side tracking solution for e-commerce applications that combines the reliability of server-side tracking with the flexibility of Google Tag Manager (GTM). This implementation provides a hybrid approach to tracking, ensuring maximum data accuracy while maintaining the ease of use of traditional tag management systems.

## Features

- **Hybrid Tracking System**
  - Server-side event tracking
  - Client-side GTM integration
  - Dual-sending capability
  - Event deduplication

- **Reliable Event Processing**
  - Queue-based event handling
  - Automatic retries
  - Error handling
  - Comprehensive logging

- **User Identification**
  - Server-side session management
  - Cross-device tracking
  - Privacy-compliant user identification
  - Consistent client IDs

- **Data Quality**
  - Event deduplication
  - Data validation
  - Rich context enrichment
  - Consistent tracking

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```env
GA4_MEASUREMENT_ID=your_measurement_id
GA4_API_SECRET=your_api_secret
GTM_ID=your_gtm_id
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

3. Start Redis server

4. Run the application:
```bash
npm start
```

## Usage

### Basic Event Tracking

```typescript
import { useTracking } from './hooks/useTracking';

const { trackEvent } = useTracking();

// Track a custom event
await trackEvent({
  eventName: 'custom_event',
  properties: {
    // Your event properties
  }
});
```

### E-commerce Events

```typescript
const { trackEcommerceEvent } = useTracking();

// Track a purchase
await trackEcommerceEvent({
  eventName: 'purchase',
  transactionId: 'T_12345',
  value: 99.99,
  currency: 'USD',
  items: [{
    itemId: 'SKU_123',
    itemName: 'Product Name',
    price: 99.99,
    quantity: 1
  }]
});
```

### Page Views

```typescript
const { trackPageView } = useTracking();

// Track a page view
await trackPageView({
  page: '/products',
  title: 'Product Catalog'
});
```

## Architecture

### Core Components

1. **TrackingService**
   - Handles core event processing
   - Manages GA4 integration
   - Provides data enrichment
   - Implements retry logic

2. **DualTrackingManager**
   - Manages dual-sending of events
   - Handles event deduplication
   - Maintains event consistency
   - Provides tracking utilities

3. **EcommerceEventHandler**
   - Implements e-commerce specific events
   - Handles purchase tracking
   - Manages cart events
   - Provides type-safe interfaces

### Event Flow

1. Event is triggered (client or server)
2. Event is processed by DualTrackingManager
3. Event is enriched with additional data
4. Event is sent to both server and client (if configured)
5. Deduplication is handled automatically
6. Events are processed by GA4

## GTM Configuration

### Setup Steps

1. Create a new GTM container
2. Add the GA4 configuration tag
3. Set up the deduplication custom HTML tag
4. Configure triggers for client-side events
5. Set up custom dimensions

### Deduplication Configuration

```javascript
// Add this to your GTM container
function() {
  return function(model) {
    var eventId = model.get('event_id');
    var userId = model.get('user_id');
    var sessionId = model.get('session_id');
    
    // Deduplication logic
    // ...
  };
}
```

## Best Practices

### Event Selection

- **Server-side only:**
  - Critical transactions
  - User authentication
  - Sensitive data

- **Client-side only:**
  - Page views
  - User interactions
  - Real-time events

- **Both:**
  - E-commerce events
  - Form submissions
  - Important conversions

### Data Quality

1. **Validation**
   - Validate event data
   - Check required fields
   - Ensure data consistency

2. **Enrichment**
   - Add server context
   - Include user data
   - Add timestamps

3. **Deduplication**
   - Use event IDs
   - Implement time windows
   - Monitor effectiveness

## Monitoring

### Key Metrics

1. **Event Processing**
   - Success rate
   - Processing time
   - Error rate

2. **Data Quality**
   - Duplicate rate
   - Data completeness
   - Validation success

3. **Performance**
   - Queue size
   - Processing delay
   - Memory usage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License

## Support

For support, please open an issue in the GitHub repository.

## Roadmap

- [ ] Additional analytics platform support
- [ ] Enhanced deduplication strategies
- [ ] Real-time monitoring dashboard
- [ ] Advanced data enrichment
- [ ] Machine learning for anomaly detection 