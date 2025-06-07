# Server-Side E-commerce Tracking

A robust server-side tracking solution for e-commerce applications that combines the reliability of server-side tracking with the flexibility of Google Tag Manager (GTM). This implementation provides a hybrid approach to tracking, ensuring maximum data accuracy while maintaining the ease of use of traditional tag management systems.

## Features

- **Serverless Architecture**
  - Vercel deployment ready
  - Serverless functions for tracking
  - Redis integration with Upstash
  - Automatic scaling

- **Hybrid Tracking System**
  - Server-side event tracking
  - Client-side GTM integration
  - Event deduplication
  - Queue-based processing

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

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd serverside-tracking
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env.local` file with:
```env
GA4_MEASUREMENT_ID=your_measurement_id
GA4_API_SECRET=your_api_secret
GTM_ID=your_gtm_id
REDIS_URL=your_upstash_redis_url
```

## Development

1. Start the development server:
```bash
npm run dev
```

2. Access the application at `http://localhost:3000`

## Deployment to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Set up environment variables in Vercel:
```bash
vercel env add GA4_MEASUREMENT_ID
vercel env add GA4_API_SECRET
vercel env add GTM_ID
vercel env add REDIS_URL
```

4. Deploy to Vercel:
```bash
vercel
```

## Redis Setup with Upstash

1. Create an account at [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Copy the Redis URL provided by Upstash
4. Add the Redis URL to your Vercel environment variables

## Architecture

### Core Components

1. **TrackingService**
   - Handles core event processing
   - Manages GA4 integration
   - Provides data enrichment
   - Implements retry logic
   - Redis queue integration

2. **Serverless Functions**
   - API routes for tracking
   - Product endpoints
   - Health checks
   - Cart management

3. **Event Flow**
   1. Event is triggered (client or server)
   2. Event is processed by serverless function
   3. Event is enriched with additional data
   4. Event is queued in Redis (if available)
   5. Event is processed and sent to GA4
   6. Event is stored in Redis for analytics

## API Endpoints

- `GET /api/products` - List all products
- `GET /api/products/[id]` - Get product details
- `POST /api/track` - Track custom events
- `POST /api/cart` - Handle cart events
- `GET /api/health` - Health check endpoint

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