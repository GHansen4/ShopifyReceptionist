# Quick Start Guide

## 🚀 Getting Started with the Shopify Voice Receptionist

### Prerequisites

- Node.js 18+ 
- npm 9+
- Shopify Partner Account
- Vapi Account
- Supabase Project
- Sentry Account (optional)

### Installation

```bash
# Clone repository
git clone https://github.com/your-company/shopify-voice-receptionist.git
cd shopify-voice-receptionist

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Fill in all required values in .env
```

### Environment Variables

```env
# Shopify
SHOPIFY_API_KEY=your_key_here
SHOPIFY_API_SECRET=your_secret_here
SHOPIFY_SCOPES=write_products,read_products,write_orders,read_orders

# Vapi
VAPI_API_KEY=your_key_here
VAPI_PUBLIC_KEY=your_key_here

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_key_here

# Sentry (optional)
SENTRY_DSN=your_dsn_here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Development

```bash
# Start dev server with Turbopack
npm run dev

# Visit http://localhost:3000

# In another terminal, watch for linting
npm run lint:fix

# Format code
npm run format
```

### Code Quality

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Format check
npm run format:check

# Run all checks
npm run type-check && npm run lint && npm run format:check
```

### Database Setup

1. **Create Supabase Project**
   - Go to supabase.com
   - Create new project
   - Note the URL and anon key

2. **Run Migration**
   ```sql
   -- Copy contents of migrations/001_initial_schema.sql
   -- Paste into Supabase SQL Editor
   -- Execute
   ```

3. **Enable Row Level Security**
   - All tables have RLS enabled
   - Policies are set in migration

### Shopify App Setup

1. **Create App in Partner Dashboard**
   - Name: "Voice Receptionist"
   - App URL: `http://localhost:3000` (dev) or your domain (prod)
   - Redirect URL: `http://localhost:3000/api/auth/callback`

2. **Copy API Credentials**
   - API Key → SHOPIFY_API_KEY
   - API Secret → SHOPIFY_API_SECRET

3. **Set Required Scopes**
   ```
   read_products
   write_products
   read_orders
   write_orders
   read_customers
   ```

4. **Configure Webhooks** (in Partner Dashboard)
   - `app/uninstalled` → https://your-app.com/api/webhooks
   - `products/create` → https://your-app.com/api/webhooks
   - `products/update` → https://your-app.com/api/webhooks
   - `products/delete` → https://your-app.com/api/webhooks
   - `shop/update` → https://your-app.com/api/webhooks

### Testing OAuth Flow

```bash
# 1. Start dev server
npm run dev

# 2. Open browser
# http://localhost:3000

# 3. Click "Install App" or similar
# System redirects to: /api/auth?shop=test-shop.myshopify.com

# 4. HMAC validation ✓
# 5. Nonce verification ✓
# 6. Redirect to Shopify ✓
# 7. User authorizes ✓
# 8. Callback received ✓
# 9. Token stored in Supabase ✓
# 10. Session cookie set ✓
# 11. Redirect to home ✓
```

### Testing Rate Limiting

```bash
# Auth rate limit (5 per hour per IP)
for i in {1..6}; do
  curl http://localhost:3000/api/auth?shop=test.myshopify.com
  sleep 1
done
# 6th request returns 429

# Check rate limit metrics (requires Bearer token)
curl -H "Authorization: Bearer test-token" \
  http://localhost:3000/api/admin/rate-limits
```

### API Endpoints

#### Public Endpoints
- `GET /api/health` - Health check

#### Protected Endpoints (require session token)
- `GET /api/receptionists` - List receptionists
- `POST /api/receptionists` - Create receptionist

#### OAuth Endpoints
- `GET /api/auth` - Start OAuth
- `GET /api/auth/callback` - Handle OAuth callback

#### Webhook Endpoint
- `POST /api/webhooks` - Receive Shopify webhooks

#### Admin Endpoints
- `GET /api/admin/rate-limits` - View rate limit metrics

### Common Tasks

#### Create a Protected API Endpoint

```typescript
// app/api/example/route.ts
import { NextRequest } from 'next/server';
import { getShopContext } from '@/lib/shopify/context';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/api';
import { AuthenticationError } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  try {
    const shopContext = getShopContext(request);
    
    if (!shopContext) {
      return createErrorResponse(
        new AuthenticationError('Not authenticated')
      );
    }

    return createSuccessResponse({
      shop: shopContext.shop,
      data: [], // Your data here
    });
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}
```

#### Add Rate Limiting to Endpoint

```typescript
// app/api/example/route.ts
import { withShopifyRateLimit } from '@/lib/rate-limiter-middleware';

export async function GET(request: NextRequest) {
  return withShopifyRateLimit(request, async () => {
    // Your handler code
  });
}
```

#### Log Errors with Context

```typescript
import { logError } from '@/lib/utils/errors';

try {
  // Your code
} catch (error) {
  logError(error, {
    shopId: shop.id,
    context: 'product_sync',
    productCount: 42,
  });
}
```

#### Database Operations

```typescript
import { getShopByDomain, createCall } from '@/lib/supabase/db';

// Get shop
const shop = await getShopByDomain('test.myshopify.com');

// Create call record
const call = await createCall({
  shop_id: shop.id,
  vapi_call_id: 'call_123',
  customer_phone: '+1234567890',
  duration_seconds: 300,
  transcript: { text: 'call transcript' },
  started_at: new Date(),
  ended_at: new Date(),
});
```

### Troubleshooting

#### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript Errors

```bash
# Check all errors
npm run type-check

# Clear cache
npm run clean:cache

# Rebuild
npm run build
```

#### Linting Errors

```bash
# Check errors
npm run lint

# Auto-fix common issues
npm run lint:fix

# Format all files
npm run format
```

### Production Deployment

#### Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

#### Self-Hosted

```bash
# Build
npm run build

# Start
npm run start

# Use PM2 for process management
npm install -g pm2
pm2 start npm --name "voice-receptionist" -- start
pm2 save
```

### Monitoring

#### Sentry Dashboard
- Monitor errors in real-time
- Set up alerts for critical issues
- Track rate limit violations

#### Rate Limit Metrics
```bash
curl -H "Authorization: Bearer admin-token" \
  http://localhost:3000/api/admin/rate-limits
```

#### Database Monitoring
- Supabase dashboard shows query performance
- Check RLS policies working correctly
- Monitor database size

### Next Steps

1. ✅ **Local Setup Complete**
2. 📱 **Create Shopify Test Store**
3. 🔧 **Install App in Test Store**
4. 🎤 **Integrate Vapi AI** (Week 2)
5. 📊 **Build Admin Dashboard** (Week 2)

### Documentation

- [Rate Limiting Guide](./RATE_LIMITING.md)
- [Week 1 Summary](./WEEK1_SUMMARY.md)
- [Requirements](./REQUIREMENTS.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

### Support

- **Issues:** Create GitHub issue
- **Questions:** Check docs or existing issues
- **Security:** Report to security@company.com

---

**Happy coding! 🚀**
