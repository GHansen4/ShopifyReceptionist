# Data Flow Architecture - Shopify Voice Receptionist

## 🏗️ DATA FLOW OVERVIEW

This document outlines the complete data flow architecture for OAuth authentication and product access in the Shopify Voice Receptionist app.

## 📊 DATA FLOW DIAGRAM

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   OAuth Flow  │    │  Session Storage   │    │  Vapi Functions  │
│               │    │                    │    │                 │
│ 1. User Auth  │───▶│ shopify_sessions   │    │                 │
│ 2. Token     │    │ - access_token     │    │                 │
│ 3. Session    │    │ - shop             │    │                 │
│               │    │ - is_online        │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │  Business Data   │    │  Product Access │
                       │                  │    │                 │
                       │ shops            │    │ GraphQL API     │
                       │ - shop_domain    │    │ - getProducts   │
                       │ - vapi_assistant │    │ - searchProducts│
                       │ - phone_number   │    │ - checkOrders   │
                       └──────────────────┘    └─────────────────┘
```

## 🔐 OAUTH DATA FLOW

### **Step 1: OAuth Initiation**
```typescript
// User clicks "Install App" in Shopify Admin
GET /api/auth?shop=store.myshopify.com
↓
// Redirects to Shopify OAuth
shopify.auth.begin({ shop, callbackPath: '/api/auth/callback' })
```

### **Step 2: OAuth Callback**
```typescript
// Shopify redirects back with authorization code
GET /api/auth/callback?code=xxx&shop=store.myshopify.com
↓
// Shopify library processes OAuth
const { session } = await shopify.auth.callback({ rawRequest, rawResponse })
↓
// Session stored in shopify_sessions table
await sessionStorage.storeSession(session)
```

### **Step 3: Session Storage**
```sql
-- Data stored in shopify_sessions table
INSERT INTO shopify_sessions (
  id,                    -- 'offline_store.myshopify.com'
  shop,                  -- 'store.myshopify.com'
  access_token,          -- Shopify access token
  is_online,            -- false (offline token)
  scope,                -- 'read_products,read_inventory'
  expires,              -- NULL (offline tokens don't expire)
  created_at,
  updated_at
);
```

## 🛍️ PRODUCT ACCESS DATA FLOW

### **Step 1: Vapi Function Call**
```typescript
// Vapi AI calls our function endpoint
POST /api/vapi/functions
{
  "message": {
    "toolCalls": [{
      "function": { "name": "get_products" }
    }]
  }
}
```

### **Step 2: Shop Resolution**
```typescript
// Get shop domain from shops table using assistant ID
const { data: shop } = await supabaseAdmin
  .from('shops')
  .select('shop_domain, vapi_assistant_id')
  .eq('vapi_assistant_id', assistantId)
  .single();
```

### **Step 3: Session Lookup**
```typescript
// Get access token from shopify_sessions table
const { data: session } = await supabaseAdmin
  .from('shopify_sessions')
  .select('access_token, shop')
  .eq('shop', shop.shop_domain)
  .eq('is_online', false)  // Prefer offline tokens
  .single();
```

### **Step 4: Product API Call**
```typescript
// Use session token to call Shopify GraphQL API
const products = await adminGraphQL({
  shopDomain: shop.shop_domain,
  accessToken: session.access_token,
  query: getProductsQuery,
  variables: { first: 5 }
});
```

## 🗄️ DATABASE SCHEMA RELATIONSHIPS

### **Primary Tables**

#### **shopify_sessions** (OAuth Storage)
```sql
-- Stores Shopify OAuth sessions
CREATE TABLE shopify_sessions (
  id VARCHAR(255) PRIMARY KEY,           -- Session ID
  shop VARCHAR(255) NOT NULL,            -- Shop domain
  access_token TEXT NOT NULL,            -- Shopify access token
  is_online BOOLEAN DEFAULT FALSE,       -- Token type
  scope VARCHAR(255),                    -- Granted scopes
  expires TIMESTAMP,                     -- Token expiration
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **shops** (Business Data)
```sql
-- Stores shop business data and Vapi integration
CREATE TABLE shops (
  id UUID PRIMARY KEY,
  shop_domain VARCHAR(255) UNIQUE,       -- Links to shopify_sessions.shop
  vapi_assistant_id VARCHAR(255) UNIQUE, -- Links to Vapi assistant
  phone_number VARCHAR(50),              -- Shop phone
  provisioned_phone_number VARCHAR(50),   -- Vapi phone
  settings JSONB,                        -- Shop preferences
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **Data Flow Relationships**

```
shopify_sessions.shop ──┐
                        │
                        ▼
shops.shop_domain ──────┘
                        │
                        ▼
shops.vapi_assistant_id ──▶ Vapi Functions
```

## 🔄 CRITICAL DATA FLOW PATTERNS

### **Pattern 1: OAuth → Session Storage**
```typescript
// OAuth callback stores session
OAuth Callback → shopify_sessions table → Session available for API calls
```

### **Pattern 2: Vapi → Shop → Session → API**
```typescript
// Vapi function call flow
Vapi Function → shops table (get shop_domain) → shopify_sessions table (get access_token) → Shopify API
```

### **Pattern 3: Product Access**
```typescript
// Product queries use session tokens
Product Query → shopify_sessions.access_token → Shopify GraphQL API → Product Data
```

## ⚡ PERFORMANCE OPTIMIZATIONS

### **Database Indexes**
```sql
-- Critical indexes for data flow performance
CREATE INDEX idx_shopify_sessions_shop ON shopify_sessions(shop);
CREATE INDEX idx_shopify_sessions_online ON shopify_sessions(is_online);
CREATE INDEX idx_shops_vapi_assistant ON shops(vapi_assistant_id);
CREATE INDEX idx_shops_domain ON shops(shop_domain);
```

### **Query Optimization**
```typescript
// Efficient shop lookup
SELECT shop_domain FROM shops WHERE vapi_assistant_id = ? LIMIT 1;

// Efficient session lookup
SELECT access_token FROM shopify_sessions 
WHERE shop = ? AND is_online = false LIMIT 1;
```

## 🛡️ SECURITY CONSIDERATIONS

### **Row Level Security (RLS)**
```sql
-- Sessions are internal-only
CREATE POLICY "Service role manages sessions" ON shopify_sessions
  FOR ALL TO service_role USING (true);

-- Deny user access to sessions
CREATE POLICY "Deny user access to sessions" ON shopify_sessions
  FOR ALL TO authenticated USING (false);
```

### **Data Isolation**
- **Sessions**: Internal-only, no user access
- **Shops**: Business data, service role access
- **Products**: Cached data, shop-scoped access

## 🚨 COMMON DATA FLOW ISSUES

### **Issue 1: Wrong Table Access**
```typescript
// ❌ WRONG: Looking for tokens in shops table
const { data } = await supabase.from('shops').select('access_token')

// ✅ CORRECT: Looking for tokens in shopify_sessions table
const { data } = await supabase.from('shopify_sessions').select('access_token')
```

### **Issue 2: Missing Shop Resolution**
```typescript
// ❌ WRONG: Direct session lookup without shop resolution
const { data } = await supabase.from('shopify_sessions').eq('vapi_assistant_id', id)

// ✅ CORRECT: Two-step lookup
// 1. Get shop_domain from shops table
// 2. Get session from shopify_sessions table
```

### **Issue 3: Token Type Confusion**
```typescript
// ❌ WRONG: Using online tokens for API calls
const { data } = await supabase.from('shopify_sessions').eq('is_online', true)

// ✅ CORRECT: Using offline tokens for API calls
const { data } = await supabase.from('shopify_sessions').eq('is_online', false)
```

## 📋 DATA FLOW CHECKLIST

### **OAuth Flow**
- [ ] OAuth callback stores session in `shopify_sessions`
- [ ] Session includes `access_token`, `shop`, `is_online`
- [ ] Offline tokens are used for API access
- [ ] Session is properly linked to shop domain

### **Vapi Functions**
- [ ] Assistant ID resolves to shop domain
- [ ] Shop domain resolves to session token
- [ ] Session token is used for Shopify API calls
- [ ] Product queries use GraphQL with proper credentials

### **Performance**
- [ ] Database indexes support lookup patterns
- [ ] Queries are optimized for performance
- [ ] Caching is implemented where appropriate
- [ ] Rate limiting is handled properly

## 🎯 SUCCESS CRITERIA

### **Data Flow Success**
- ✅ OAuth sessions are stored correctly
- ✅ Vapi functions can resolve shop and session
- ✅ Product queries work with valid tokens
- ✅ No "Missing admin token" errors
- ✅ All API calls use correct credentials

### **Performance Success**
- ✅ Shop lookup < 100ms
- ✅ Session lookup < 50ms
- ✅ Product queries < 500ms
- ✅ No database bottlenecks
- ✅ Proper error handling

---

**This architecture ensures reliable data flow from OAuth through to product access, following Shopify's best practices and maintaining optimal performance.**
