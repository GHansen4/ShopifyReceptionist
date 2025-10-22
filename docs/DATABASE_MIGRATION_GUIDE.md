# Database Migration Guide - Session-Based Authentication

## Overview

This migration adds the `shopify_sessions` table required for Shopify's prescribed session-based authentication approach.

---

## 🚀 Quick Start

### Step 1: Run the Migration

Open your **Supabase SQL Editor** and run:

```sql
-- Copy/paste the entire contents of:
-- database/002_shopify_sessions.sql
```

Or run directly via Supabase CLI:

```bash
supabase db push database/002_shopify_sessions.sql
```

### Step 2: Verify the Migration

```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'shopify_sessions'
);

-- Should return: true
```

### Step 3: Test OAuth Flow

1. Start your app: `npm run dev`
2. Visit: `https://localhost:3000/api/auth?shop=your-store.myshopify.com`
3. Complete OAuth
4. Check sessions table:

```sql
SELECT 
  id, 
  shop, 
  is_online, 
  expires, 
  created_at,
  access_token IS NOT NULL as has_token
FROM shopify_sessions 
ORDER BY created_at DESC;
```

You should see a session with `has_token = true`!

---

## 📊 What Changed

### Before (Manual Token Management)

```
shops table:
├── shop_domain
├── access_token ❌ Manual management
└── ...
```

**Problems:**
- Manual token storage
- No token refresh
- Doesn't work with Shopify CLI
- Complex custom OAuth code

### After (Session-Based Authentication)

```
shopify_sessions table:     shops table:
├── id                      ├── shop_domain
├── shop                    ├── shop_name
├── access_token ✅ Auto    ├── subscription_status
├── expires                 └── ... (business data only)
├── scope
└── ... (managed by library)
```

**Benefits:**
- Shopify library manages tokens
- Automatic token refresh
- Works with Shopify CLI out-of-the-box
- Less code to maintain

---

## 🔄 Migration Steps

### 1. Backup Current Data (Optional)

```sql
-- Export shops table with tokens
COPY (
  SELECT shop_domain, access_token 
  FROM shops 
  WHERE access_token IS NOT NULL
) TO '/tmp/shop_tokens_backup.csv' WITH CSV HEADER;
```

### 2. Run Migration

```sql
-- Run database/002_shopify_sessions.sql
```

### 3. Migrate Existing Tokens (If Needed)

If you have existing shops with access tokens, you can migrate them:

```sql
-- Create sessions from existing tokens
INSERT INTO shopify_sessions (
  id,
  shop,
  state,
  is_online,
  scope,
  access_token,
  expires,
  created_at
)
SELECT 
  'offline_' || shop_domain as id,
  shop_domain as shop,
  'migrated' as state,
  false as is_online,
  'read_products,read_orders,read_customers' as scope, -- Your app scopes
  access_token,
  NULL as expires, -- Offline tokens don't expire
  NOW() as created_at
FROM shops
WHERE access_token IS NOT NULL
  AND access_token != 'test-token';
```

### 4. Verify Migration

```sql
-- Check migrated sessions
SELECT 
  id,
  shop,
  access_token IS NOT NULL as has_token,
  created_at
FROM shopify_sessions
ORDER BY created_at DESC;
```

### 5. Test New OAuth Flow

- Complete a fresh OAuth flow for one shop
- Verify session is created automatically
- Test API calls work

### 6. Clean Up (After Verification)

Once you've verified everything works, you can remove the old `access_token` column:

```sql
-- ⚠️ ONLY RUN AFTER VERIFYING NEW AUTH WORKS
ALTER TABLE shops DROP COLUMN IF EXISTS access_token;
```

---

## 🧪 Testing

### Test 1: OAuth Flow

```bash
# Start app
npm run dev

# In browser, visit:
https://localhost:3000/api/auth?shop=your-store.myshopify.com
```

**Expected:**
1. Redirects to Shopify OAuth page
2. After approval, redirects back to your app
3. Session created in `shopify_sessions` table

### Test 2: API Call

```bash
# In browser or Postman, visit:
https://localhost:3000/api/shopify/products?shop=your-store.myshopify.com&limit=5
```

**Expected:**
- Returns products
- No manual token handling
- Library loads session automatically

### Test 3: Shopify CLI

```bash
# Start with Shopify CLI
shopify app dev
```

**Expected:**
- CLI creates session automatically
- App works without manual token setup
- GraphiQL works

---

## 🔍 Troubleshooting

### Session Not Created

**Symptom:** No rows in `shopify_sessions` after OAuth

**Check:**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'shopify_sessions';
```

**Fix:**
- Ensure `SupabaseSessionStorage` uses `supabaseAdmin` (service role key)
- Verify `SUPABASE_SERVICE_ROLE_KEY` is in `.env`

### Access Token Missing

**Symptom:** Session created but `access_token` is NULL

**Check:**
```sql
SELECT id, shop, access_token FROM shopify_sessions;
```

**Fix:**
- Check OAuth callback logs
- Verify Shopify API keys are correct
- Ensure redirect URLs match in Shopify Partner Dashboard

### API Calls Fail

**Symptom:** Products API returns "No session found"

**Possible Issues:**
1. Session expired (check `expires` column)
2. Shop parameter mismatch
3. Session storage not initialized

**Debug:**
```typescript
// Add to API route
console.log('[Debug] Looking for session for shop:', shop);

const sessions = await supabaseAdmin
  .from('shopify_sessions')
  .select('*')
  .eq('shop', shop);
  
console.log('[Debug] Found sessions:', sessions.data);
```

---

## 📋 Verification Checklist

- [ ] Migration ran successfully
- [ ] `shopify_sessions` table exists
- [ ] RLS policies created
- [ ] OAuth flow creates session
- [ ] Session has `access_token`
- [ ] API calls work with session
- [ ] Shopify CLI works
- [ ] No errors in logs
- [ ] Old `shops.access_token` column removed (after verification)

---

## 🔄 Rollback (If Needed)

If you need to rollback:

```sql
-- Drop the new table
DROP TABLE IF EXISTS shopify_sessions CASCADE;

-- Restore old approach (if you backed up)
-- You'll need to restore old code from git as well
```

---

## 📚 References

- [Shopify API Library](https://github.com/Shopify/shopify-api-js)
- [Session Storage Guide](https://github.com/Shopify/shopify-api-js/blob/main/docs/guides/session-storage.md)
- [Shopify Auth Docs](https://shopify.dev/docs/apps/build/authentication-authorization)

---

## ✅ Success Criteria

You'll know the migration succeeded when:

1. ✅ OAuth flow completes without errors
2. ✅ Sessions appear in `shopify_sessions` table
3. ✅ Products API returns data
4. ✅ Shopify CLI works without manual token setup
5. ✅ No "access_token not found" errors
6. ✅ Logs show "Session loaded successfully"

---

**Need Help?**

Check the implementation files:
- `src/lib/shopify/session-storage.ts` - Session storage implementation
- `src/lib/shopify/client.ts` - Shopify client configuration
- `src/app/api/auth/route.ts` - OAuth initiation
- `src/app/api/auth/callback/route.ts` - OAuth callback
- `src/app/api/shopify/products/route.ts` - Example API route

Good luck! 🚀

