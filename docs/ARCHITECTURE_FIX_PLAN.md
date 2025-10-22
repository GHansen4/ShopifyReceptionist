# Architecture Fix Plan - Shopify Prescribed Approach

## Problem Statement

We've been implementing a **custom/manual authentication approach** when Shopify provides all this functionality out-of-the-box through `@shopify/shopify-api`.

### What We Did Wrong:
- ❌ Manually storing access tokens in database
- ❌ Making raw REST API calls with `X-Shopify-Access-Token` header  
- ❌ Custom OAuth flow implementation
- ❌ Trying to extract and save CLI access tokens

### Why This is Wrong:
1. **Outdated Pattern**: This is the old "custom app" or "private app" approach
2. **Not Embedded App Pattern**: Modern embedded apps use session tokens
3. **Ignoring Official Library**: `@shopify/shopify-api` handles all of this
4. **Shopify CLI Compatibility**: CLI expects session-based auth

---

## ✅ Shopify's Prescribed Approach

### Official Pattern (from Shopify docs):

```typescript
// 1. Initialize Shopify API with session storage
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: ['read_products', 'read_orders'],
  hostName: 'localhost:3000',
  apiVersion: ApiVersion.October24,
  isEmbeddedApp: true,
  // Session storage - Shopify handles tokens internally
  sessionStorage: new CustomSessionStorage() // or PostgreSQLSessionStorage
});

// 2. In API routes - use authenticate pattern
export async function GET(req: Request) {
  const { session, admin } = await shopify.authenticate.admin(req);
  
  // session.accessToken is managed by Shopify
  // admin is pre-authenticated REST/GraphQL client
  
  const products = await admin.rest.get({ path: 'products' });
  return Response.json(products.body);
}
```

### Key Benefits:
- ✅ Shopify manages token lifecycle
- ✅ Auto token refresh
- ✅ Session validation
- ✅ Works seamlessly with Shopify CLI
- ✅ Pre-authenticated API clients
- ✅ CSRF protection built-in

---

## Implementation Plan

### Phase 1: Setup Session Storage
Create a Supabase-backed session storage that Shopify's library will use:

```typescript
// lib/shopify/session-storage.ts
import { SessionStorage } from '@shopify/shopify-api';

class SupabaseSessionStorage implements SessionStorage {
  async storeSession(session: Session): Promise<boolean> {
    // Shopify library calls this - we just store it
    await supabaseAdmin.from('shopify_sessions').upsert({
      id: session.id,
      shop: session.shop,
      state: session.state,
      isOnline: session.isOnline,
      scope: session.scope,
      expires: session.expires,
      accessToken: session.accessToken, // Shopify passes this
      onlineAccessInfo: session.onlineAccessInfo,
    });
    return true;
  }
  
  async loadSession(id: string): Promise<Session | undefined> {
    // Shopify library calls this when it needs a session
    const { data } = await supabaseAdmin
      .from('shopify_sessions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (!data) return undefined;
    return new Session(data);
  }
  
  async deleteSession(id: string): Promise<boolean> {
    await supabaseAdmin.from('shopify_sessions').delete().eq('id', id);
    return true;
  }
}
```

### Phase 2: Update Shopify Client
```typescript
// lib/shopify/client.ts
import { shopifyApi, LATEST_API_VERSION, Session } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node'; // For Next.js
import { SupabaseSessionStorage } from './session-storage';

export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(','),
  hostName: process.env.SHOPIFY_APP_URL!.replace('https://', ''),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  sessionStorage: new SupabaseSessionStorage(),
});
```

### Phase 3: Update OAuth Routes
```typescript
// app/api/auth/route.ts
import { shopify } from '@/lib/shopify/client';

export async function GET(req: Request) {
  // Shopify handles the entire OAuth flow
  return shopify.auth.begin({
    shop: new URL(req.url).searchParams.get('shop')!,
    callbackPath: '/api/auth/callback',
    isOnline: false,
    rawRequest: req,
  });
}

// app/api/auth/callback/route.ts
export async function GET(req: Request) {
  // Shopify handles token exchange AND storage
  const callback = await shopify.auth.callback({
    rawRequest: req,
  });
  
  // Session is now stored automatically via SupabaseSessionStorage
  return Response.redirect(`/?shop=${callback.session.shop}`);
}
```

### Phase 4: Update API Routes (Product Fetch)
```typescript
// app/api/shopify/products/route.ts
import { shopify } from '@/lib/shopify/client';

export async function GET(req: Request) {
  // Shopify validates session and provides authenticated client
  const { session, admin } = await shopify.authenticate.admin(req);
  
  // No manual token management needed!
  // admin.rest is pre-authenticated
  const response = await admin.rest.get({ 
    path: 'products',
    query: { limit: '5' }
  });
  
  return Response.json({
    success: true,
    products: response.body.products
  });
}
```

---

## Migration Steps

### 1. Database Schema Update
```sql
-- Add shopify_sessions table for session storage
CREATE TABLE shopify_sessions (
  id VARCHAR(255) PRIMARY KEY,
  shop VARCHAR(255) NOT NULL,
  state VARCHAR(255) NOT NULL,
  is_online BOOLEAN NOT NULL,
  scope VARCHAR(255),
  expires TIMESTAMP,
  access_token TEXT, -- Shopify manages this
  online_access_info JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_shopify_sessions_shop ON shopify_sessions(shop);

-- Keep shops table for app-specific data (not auth)
-- Remove access_token column (managed by Shopify now)
ALTER TABLE shops DROP COLUMN IF EXISTS access_token;
```

### 2. Remove Manual Token Management
Delete these files/functions:
- ❌ `GET_CLI_TOKEN_GUIDE.md` - No longer needed
- ❌ `/api/setup/extract-token` - No longer needed
- ❌ `/api/setup/detect-token` - No longer needed
- ❌ Setup page token management UI - No longer needed
- ❌ `upsertShop` access_token parameter - No longer needed

### 3. Update All Shopify API Calls
Replace manual REST calls with `authenticate.admin()`:

**Before:**
```typescript
const token = await db.getAccessToken(shop);
fetch(`https://${shop}/admin/api/.../products.json`, {
  headers: { 'X-Shopify-Access-Token': token }
});
```

**After:**
```typescript
const { admin } = await shopify.authenticate.admin(req);
await admin.rest.get({ path: 'products' });
```

---

## Benefits of This Approach

### ✅ Development (with Shopify CLI)
- CLI auto-manages sessions
- No manual token extraction
- Works out-of-the-box

### ✅ Production
- OAuth handled by Shopify library
- Automatic token refresh
- Session validation
- CSRF protection

### ✅ Security
- Tokens never exposed to frontend
- Shopify handles token lifecycle
- Industry-standard patterns

### ✅ Maintenance
- Less custom code
- Official library updates
- Better error handling

---

## Recommended Next Steps

1. **Implement Session Storage** - Create `SupabaseSessionStorage` class
2. **Update Shopify Client** - Configure with session storage
3. **Refactor OAuth Routes** - Use `shopify.auth.begin/callback`
4. **Update API Routes** - Use `shopify.authenticate.admin()`
5. **Database Migration** - Add `shopify_sessions` table
6. **Remove Old Code** - Delete manual token management
7. **Test** - Verify with `shopify app dev`

---

## Conclusion

**Current Approach**: Custom/manual (outdated, complex, error-prone)
**Prescribed Approach**: Use `@shopify/shopify-api` with session storage (modern, simple, secure)

**The Admin API access token manual management IS outdated** for embedded apps. Shopify's library handles everything through sessions.

**Action Required**: Refactor to use Shopify's official session-based authentication.

