# Product Synchronization Feature

**Week 1, Days 6-7: Shopify Admin API Integration**

---

## Overview

The product synchronization system handles fetching products from Shopify's Admin API, storing them in Supabase, and keeping them synchronized in real-time through webhooks.

**Key Features:**
- ✅ Cursor-based pagination for efficient data fetching
- ✅ Rate limiting integration (2 req/sec)
- ✅ Exponential backoff with retry logic
- ✅ XSS sanitization for product descriptions
- ✅ Batch database operations for performance
- ✅ Comprehensive error handling and logging
- ✅ Progress callbacks for UI updates
- ✅ Support for large catalogs (5000+ products)

---

## Architecture

### Two-Phase Sync Approach

```
PHASE 1: Initial Sync (on app install)
├── User clicks "Sync Products"
├── API fetches all products with pagination
├── Respects rate limits (2 req/second)
├── Saves to Supabase in batches
├── Shows progress to user
└── Returns summary (1000 products synced, 2 errors)

PHASE 2: Ongoing Sync (real-time)
├── Webhook: products/create
├── Webhook: products/update
├── Webhook: products/delete
└── Daily cron job (future: sync missed changes)
```

---

## Implementation Details

### Core Files

#### `lib/shopify/products.ts` (520+ lines)
**Main product sync library**

**Key Functions:**

```typescript
// Fetch products with cursor-based pagination
export async function fetchAllProducts(
  accessToken: string,
  shopDomain: string,
  options: { maxProducts?: number; query?: string } = {}
): Promise<{ products: ShopifyProduct[]; totalFetched: number; hasMore: boolean }>

// Orchestrate full product sync
export async function syncProductsForShop(
  shopId: string,
  accessToken: string,
  shopDomain: string,
  onProgress?: (fetched: number, total: number) => void
): Promise<{ synced: number; deleted: number; errors: number }>

// Handle webhook events
export async function handleProductCreate(
  shopId: string,
  shopDomain: string,
  shopifyProductData: Record<string, unknown>
): Promise<void>

export async function handleProductDelete(
  shopId: string,
  shopifyProductId: string
): Promise<void>
```

**Technical Details:**

- Uses Shopify GraphQL API (2024-01 version)
- Fetches 250 products per request (Shopify max)
- Cursor-based pagination for reliability
- Zod schemas validate all responses
- Exponential backoff: 1s, 2s, 4s retries
- 5-second timeout before declaring failure

#### `app/api/shopify/products/route.ts` (90+ lines)
**API endpoint for product sync**

**Endpoints:**

```
POST /api/shopify/products
- Initiates product sync in background
- Returns status immediately (doesn't wait for completion)
- Requires session token authentication
- Response: { status: 'syncing' | 'completed', ... }

GET /api/shopify/products
- Returns sync status and product count
- Requires session token authentication
- Response: { syncStatus, lastSyncedAt, productCount }
```

---

## Data Flow

### Product Data Processing

```
Shopify GraphQL API
        ↓
Zod Validation
        ↓
Extract Fields
        ├── ID: Extract product ID from GraphQL gid
        ├── Images: Get first image URL
        ├── Price: Convert to cents
        ├── Description: Sanitize for XSS
        └── Metadata: Store handle, vendor, type
        ↓
Rate Limiter
        ↓
Batch Insert (50 at a time)
        ↓
Supabase UPSERT
```

### GraphQL Query

```graphql
query GetProducts($first: Int!, $after: String, $query: String) {
  products(first: $first, after: $after, query: $query) {
    edges {
      node {
        id
        title
        description
        handle
        vendor
        productType
        images(first: 1) { edges { node { url } } }
        variants(first: 1) { edges { node { price, sku } } }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

---

## Error Handling

### Error Scenarios

| Scenario | Handling |
|----------|----------|
| Rate limit hit | Stop fetching, return partial results |
| Invalid product data | Skip product, continue, log error |
| Network error | Exponential backoff, retry up to 3 times |
| GraphQL error | Log full error, throw exception |
| Supabase insert fails | Log error context, continue to next product |
| XSS in description | Sanitize, remove scripts/iframes |

### Logging

All errors logged to Sentry with context:

```typescript
logError(error, {
  context: 'product_sync_upsert',
  shopId: string,
  productId: string,
  error: unknown,
});
```

---

## Performance Characteristics

### Benchmarks

| Metric | Value |
|--------|-------|
| Products per request | 250 (Shopify max) |
| Requests per second | 2 (rate limited) |
| Batch size to DB | 50 products |
| Retry attempts | 3 with exponential backoff |
| API request timeout | 30 seconds per request |
| Overall timeout | 5 seconds for initial response |

### Calculations

- **1000 products:** 4 requests × 0.5 sec = ~2 seconds
- **5000 products:** 20 requests × 0.5 sec = ~10 seconds
- **10,000 products:** 40 requests × 0.5 sec = ~20 seconds

### Large Catalog Strategy

For shops with >500 products:
1. ✅ Fetch products immediately (first 5000)
2. ⏱️ Plan for background sync of additional products
3. 📊 Show progress bar to user
4. 🔄 Allow manual retries if needed

---

## Database Integration

### Supabase Schema

Products are stored in the `products` table:

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  shopify_product_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  price INTEGER, -- stored in cents
  currency TEXT DEFAULT 'USD',
  inventory_quantity INTEGER,
  image_url TEXT,
  product_url TEXT,
  variants JSONB,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON products(shop_id, created_at);
CREATE INDEX ON products(shopify_product_id);
```

### Upsert Strategy

Uses `upsert` with `shopify_product_id` as conflict key:
- If product exists: update all fields
- If product doesn't exist: insert new
- Prevents duplicates
- Updates trigger `updated_at` automatically

---

## Security Considerations

### Input Validation

✅ Zod schema validates all Shopify API responses  
✅ Shopify IDs extracted via regex to prevent injection  
✅ Product descriptions sanitized (remove scripts/iframes)  
✅ Price values parsed safely (string to number conversion)

### XSS Prevention

```typescript
function sanitizeDescription(description: string | null): string | null {
  if (!description) return null;
  return description
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe/gi, '')
    .substring(0, 500); // Max 500 chars
}
```

### Authentication

✅ Session token required for all endpoints  
✅ Shop context verified before sync  
✅ Access token used from authenticated shop record

---

## Webhook Integration

### Real-Time Product Updates

**Supported Topics:**
- `products/create` - New product added
- `products/update` - Product info changed
- `products/delete` - Product removed

**Handler Location:**
`lib/webhooks.ts` - Routes to `handleProductCreate()`, etc.

**Webhook Flow:**
```
Shopify Webhook Event
        ↓
Verify HMAC Signature
        ↓
Extract Topic
        ↓
Route to Appropriate Handler
        ↓
Update Supabase
        ↓
Return 200 OK
```

---

## Usage

### Initiate Product Sync

```typescript
// Client-side (React/Next.js)
async function triggerProductSync() {
  const response = await fetch('/api/shopify/products', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.ok) {
    const result = await response.json();
    console.log(`Sync ${result.data.status}: ${result.data.result?.synced} products`);
  }
}
```

### Check Sync Status

```typescript
async function checkSyncStatus() {
  const response = await fetch('/api/shopify/products', {
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  const { data } = await response.json();
  console.log(`Status: ${data.syncStatus}, Count: ${data.productCount}`);
}
```

### Process Webhook

```typescript
// In app/api/webhooks/route.ts
import { handleProductCreate, handleProductDelete } from '@/lib/shopify/products';

// When topic === 'products/create'
await handleProductCreate(shopId, shopDomain, webhookPayload.product);

// When topic === 'products/delete'
await handleProductDelete(shopId, webhookPayload.id);
```

---

## Future Enhancements

### Phase 2 Improvements

- [ ] **Background Jobs:** Use Vercel Cron for scheduled syncs
- [ ] **Inventory Sync:** Track stock levels in real-time
- [ ] **Variant Details:** Store all product variants (not just first)
- [ ] **Categories:** Sync product collections
- [ ] **Reviews:** Integrate product ratings
- [ ] **Search Index:** Index products for voice search

### Phase 3 Optimization

- [ ] **Incremental Sync:** Only fetch updated products since last sync
- [ ] **Smart Batching:** Adjust batch sizes based on response times
- [ ] **Caching:** Redis cache for frequently accessed products
- [ ] **Top Sellers:** Prioritize best-selling products for large catalogs
- [ ] **Image Optimization:** Resize and CDN-cache product images

---

## Monitoring & Debugging

### Logging

All sync operations log to Sentry:

```
context: 'product_sync_upsert'
context: 'product_fetch_rate_limit'
context: 'fetch_all_products'
context: 'sync_products_for_shop'
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "Rate limit exceeded" | Wait 1 second, sync resumes automatically |
| "Shop not found" | Verify OAuth flow completed successfully |
| Products not appearing | Check webhooks configured in Shopify Partner Dashboard |
| HMAC validation failed | Verify `SHOPIFY_API_SECRET` is correct |
| Timeout on large catalogs | Normal behavior - sync continues in background |

---

## Testing

### Manual Testing

```bash
# Test sync endpoint
curl -X POST http://localhost:3000/api/shopify/products \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Check status
curl http://localhost:3000/api/shopify/products \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

### Test Webhook Delivery

1. Go to Shopify Partner Dashboard
2. Select your app
3. Click "Configuration"
4. Scroll to "Webhooks"
5. Click "Create webhook"
6. Select topic (e.g., products/create)
7. Click "Send test notification"

---

## Code Quality

✅ **TypeScript:** Full strict mode compliance  
✅ **Validation:** Zod schemas for all API responses  
✅ **Error Handling:** Custom error classes with Sentry integration  
✅ **Testing:** Structure supports unit/integration tests  
✅ **Documentation:** Inline comments for complex logic  

---

## Performance Tips

1. **Sync during off-peak:** Schedule for night hours if possible
2. **Batch operations:** Products inserted in batches of 50
3. **Progress UI:** Show real-time progress (via polling GET endpoint)
4. **Error recovery:** Don't retry forever, cap at 3 attempts
5. **Monitor usage:** Track sync times and errors in Sentry

---

**Status:** ✅ Production-Ready  
**Last Updated:** Week 1, Days 6-7  
**Next Phase:** Background job scheduling (Vercel Cron)
