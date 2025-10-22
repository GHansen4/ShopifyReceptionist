# Rate Limiting System

## Overview

This document describes the comprehensive rate limiting system designed to protect the Shopify Voice Receptionist app from abuse and API limits.

## Rate Limit Strategies

### 1. Shopify API Rate Limiter

**Limit:** 2 calls per second per shop  
**Location:** `lib/rate-limiter.ts` - `ShopifyRateLimiter`

Shopify's REST API enforces a rate limit of 2 calls per second per shop. This limiter ensures we never exceed this threshold.

```typescript
import { shopifyLimiter } from '@/lib/rate-limiter';

// Execute function with automatic rate limiting
try {
  const result = await shopifyLimiter.executeWithLimit(shopId, async () => {
    // Make Shopify API call
    return await shopifyApi.rest.Product.all();
  });
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log('Rate limit hit, retry after header includes delay');
  }
}
```

**Headers Monitoring:**

The limiter monitors the `X-Shopify-Shop-Api-Call-Limit` response header to proactively throttle requests when approaching the limit (80% threshold).

```typescript
// Automatically called when Shopify API responds
const status = shopifyLimiter.updateFromHeader(
  shopId,
  'X-Shopify-Shop-Api-Call-Limit: 32/40'
);

// status will indicate remaining capacity
```

### 2. Vapi AI Rate Limiter

**Limit:** 100 calls per hour per shop  
**Cost Tracking:** Alerts when daily spend exceeds threshold  
**Location:** `lib/rate-limiter.ts` - `VapiRateLimiter`

Prevents runaway costs by tracking incoming calls and alerting when usage spikes.

```typescript
import { vapiLimiter } from '@/lib/rate-limiter';
import { checkVapiRateLimit } from '@/lib/rate-limiter-middleware';

// Record a call
const result = vapiLimiter.recordCall(
  shopId,
  durationSeconds, // call duration
  costCents // cost in cents
);

if (!result.allowed) {
  console.warn(
    `Vapi limit exceeded for shop ${shopId}`,
    `Calls remaining: ${result.callsRemaining}`,
    `Estimated cost this hour: $${result.estimatedCost / 100}`
  );
}

// Or use in route handlers
const limitCheck = checkVapiRateLimit(shopId, duration, costCents);
if (!limitCheck.allowed) {
  return createErrorResponse(new RateLimitError(limitCheck.message));
}
```

### 3. Webhook Rate Limiter

**Limit:** 100 webhooks per minute per shop  
**Location:** `lib/rate-limiter.ts` - `WebhookRateLimiter`

Prevents webhook flooding attacks and ensures we can process webhooks reliably.

```typescript
import { webhookLimiter } from '@/lib/rate-limiter';

const status = webhookLimiter.checkLimit(shopId);

if (status.remaining === 0) {
  // Handle webhook flood - log and reject
  console.warn(`Webhook rate limit exceeded for shop: ${shopId}`);
  return NextResponse.json(
    { error: 'Too many webhooks' },
    { status: 429 }
  );
}
```

### 4. Authentication Rate Limiter

**Limit:** 5 OAuth attempts per hour per IP address  
**Location:** `lib/rate-limiter.ts` - `AuthRateLimiter`

Prevents brute force attacks on the OAuth flow.

```typescript
import { authLimiter } from '@/lib/rate-limiter';

const { allowed, status } = authLimiter.checkAuthAttempt(ipAddress);

if (!allowed) {
  const retryAfter = Math.ceil((status.resetAt - Date.now()) / 1000);
  return NextResponse.json(
    { error: 'Too many authentication attempts' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
      },
    }
  );
}
```

## Implementation in Routes

### Protected Endpoints with Rate Limiting

All rate limiting is applied via middleware functions in `lib/rate-limiter-middleware.ts`:

#### Auth Endpoint

```typescript
// /api/auth
import { withAuthRateLimit } from '@/lib/rate-limiter-middleware';

export async function GET(request: NextRequest) {
  return withAuthRateLimit(request, async () => {
    // Route handler code
  });
}
```

#### Webhook Endpoint

```typescript
// /api/webhooks
import { withWebhookRateLimit } from '@/lib/rate-limiter-middleware';

export async function POST(request: NextRequest) {
  return withWebhookRateLimit(request, async () => {
    // Webhook processing code
  });
}
```

#### Shopify API Calls

```typescript
// /api/products or any endpoint making Shopify API calls
import { withShopifyRateLimit } from '@/lib/rate-limiter-middleware';

export async function GET(request: NextRequest) {
  return withShopifyRateLimit(request, async () => {
    // Handler that makes Shopify API calls
  });
}
```

## Response Headers

All rate-limited responses include standard rate limit headers:

```
RateLimit-Limit: 5
RateLimit-Remaining: 2
RateLimit-Reset: 1635789456
Retry-After: 3600
```

When a rate limit is hit, the response includes:

**Status Code:** `429 Too Many Requests`

**Headers:**
- `Retry-After`: Seconds to wait before retrying
- `RateLimit-Reset`: Unix timestamp when limit resets

**Body:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT",
    "message": "Shopify API rate limit exceeded. Retry after 1s",
    "statusCode": 429
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Monitoring and Metrics

### Admin Dashboard Endpoint

**GET** `/api/admin/rate-limits` - Requires Bearer token

Returns current rate limit statistics:

```json
{
  "success": true,
  "data": {
    "metrics": {
      "shopify": {
        "identifiers": 42,
        "entries": 42
      },
      "vapi": {
        "identifiers": 42,
        "entries": 42
      },
      "webhook": {
        "identifiers": 42,
        "entries": 42
      },
      "auth": {
        "identifiers": 12,
        "entries": 12
      }
    },
    "info": {
      "shopify": "Shopify API: 2 requests per second per shop",
      "vapi": "Vapi: 100 calls per hour per shop",
      "webhook": "Webhooks: 100 per minute per shop",
      "auth": "Auth: 5 attempts per hour per IP"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Getting Metrics in Code

```typescript
import { getMetrics } from '@/lib/rate-limiter';

const metrics = getMetrics();
console.log(metrics);
// {
//   shopify: { identifiers: 42, entries: 42 },
//   vapi: { identifiers: 42, entries: 42 },
//   webhook: { identifiers: 42, entries: 42 },
//   auth: { identifiers: 12, entries: 12 }
// }
```

## Error Handling and Logging

All rate limit violations are:

1. **Logged to Sentry** for monitoring
2. **Included in response** with clear error messages
3. **Tracked by type** (shopify_rate_limit, vapi_rate_limit, etc.)

### Example Error Logging

```typescript
logError(new Error('Auth rate limit exceeded'), {
  ip: '192.168.1.1',
  type: 'auth_rate_limit',
  attemptNumber: 6,
});
```

## Production Considerations

### 1. In-Memory Storage

Currently, rate limits are stored in-memory using a `Map`. This is suitable for single-server deployments.

**For multi-server deployments**, upgrade to Redis:

```typescript
// Future: Redis-based rate limiter
import Redis from 'ioredis';

class RedisRateLimiter extends RateLimiter {
  constructor(private redis: Redis) {
    super({ maxRequests, windowMs });
  }

  async isAllowed(identifier: string) {
    // Use Redis INCR and EXPIRE for distributed counting
  }
}
```

### 2. Cleanup and Memory Leaks

The system automatically cleans up expired entries on each check. For high-traffic deployments, consider periodic cleanup:

```typescript
// Cleanup every hour
setInterval(() => {
  shopifyLimiter.reset('all'); // Clear specific entries if needed
}, 60 * 60 * 1000);
```

### 3. Alerting

Configure Sentry to alert when:
- Auth rate limit exceeded multiple times
- Webhook flooding detected
- Vapi costs exceed threshold
- Shopify API frequently at 80%+ capacity

### 4. Scaling Beyond In-Memory

When scaling to multiple instances:

1. **Replace Map-based storage with Redis**
2. **Use atomic INCR operations** for counting
3. **Set automatic expiry** on Redis keys
4. **Monitor Redis memory** usage

## Testing Rate Limits

### Manual Testing

```bash
# Test auth rate limiting (5 attempts per hour per IP)
for i in {1..6}; do
  curl http://localhost:3000/api/auth?shop=test.myshopify.com
  echo "Attempt $i"
  sleep 1
done
# 6th request should return 429

# Test webhook rate limiting (100 per minute)
for i in {1..101}; do
  curl -X POST http://localhost:3000/api/webhooks \
    -H "x-shopify-hmac-sha256: valid-hmac" \
    -H "x-shopify-topic: products/create" \
    -d '{"id":"123"}'
  echo "Webhook $i"
done
# 101st request should return 429
```

### Unit Testing

```typescript
import { authLimiter } from '@/lib/rate-limiter';

describe('Rate Limiter', () => {
  it('should enforce auth rate limit', () => {
    const ip = 'test-ip';
    for (let i = 0; i < 5; i++) {
      const { allowed } = authLimiter.checkAuthAttempt(ip);
      expect(allowed).toBe(true);
    }
    const { allowed: sixthAllowed } = authLimiter.checkAuthAttempt(ip);
    expect(sixthAllowed).toBe(false);
  });
});
```

## Configuration

### Adjusting Limits

Edit `lib/rate-limiter.ts` to customize limits:

```typescript
export class ShopifyRateLimiter extends RateLimiter {
  constructor() {
    super({ maxRequests: 2, windowMs: 1000 }); // Adjust here
  }
}

export class VapiRateLimiter extends RateLimiter {
  constructor(
    private costAlertThreshold: number = 10000 // Alert at $100
  ) {
    super({ maxRequests: 100, windowMs: 60 * 60 * 1000 }); // Or here
  }
}
```

### Environment Variables

Consider adding to `.env`:

```env
# Rate Limiting
RATE_LIMIT_SHOPIFY_PER_SECOND=2
RATE_LIMIT_VAPI_PER_HOUR=100
RATE_LIMIT_WEBHOOK_PER_MINUTE=100
RATE_LIMIT_AUTH_PER_HOUR=5
VAPI_COST_ALERT_CENTS=10000
```

## Common Scenarios

### Scenario 1: Shop exceeds Shopify API limit

```
Request: GET /api/products
ShopifyRateLimiter detects limit exceeded
Response: 429 with Retry-After: 1
Client should wait 1 second and retry
```

### Scenario 2: Customer making many calls from same IP

```
Request: GET /api/auth?shop=test.myshopify.com (6th attempt)
AuthRateLimiter blocks: IP has already made 5 attempts
Response: 429 with Retry-After: 3600
Client should wait 1 hour before retrying
```

### Scenario 3: Webhook flooding detected

```
Webhook #101 arrives
WebhookLimiter detects 100 webhooks in 60 seconds
Response: 429 with clear error
Sentry alert: "Webhook rate limit hit for shop X"
```

### Scenario 4: Vapi costs spike

```
Call recorded: 45 seconds, cost $0.15
vapiLimiter calculates hourly cost approaching $100 threshold
Sentry log: "Vapi cost alert for shop X: $98.50 in current hour"
Admin dashboard shows warning
```

## Future Enhancements

1. **Redis backing** for multi-instance deployments
2. **Per-endpoint custom limits** based on shop plan
3. **Gradual backoff** instead of hard rejection
4. **Webhook retry queue** with exponential backoff
5. **Cost estimation** and predictive alerting
6. **Custom rate limits per shop** based on subscription tier
