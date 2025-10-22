# Supabase Setup - Quick Reference

## TL;DR - Just Fix It

### The Error
```
Could not find the table 'public.shops' in the schema cache
```

### The Fix (3 steps, 2 minutes)

#### 1. Open Supabase SQL Editor
- Go to: https://supabase.com/dashboard/projects
- Select your project
- Click: **SQL Editor** (left sidebar)

#### 2. Create New Query & Run Migration
```sql
-- Copy the ENTIRE contents of: database/001_initial_schema.sql
-- Paste into the SQL Editor
-- Click: Run
```

#### 3. Verify Tables Exist
- Click: **Table Editor** (left sidebar)
- You should see: `shops`, `calls`, `call_actions`, `products`

**Done! ✅** The error is fixed.

---

## The Problem Explained

Your app tries to save shop data after OAuth:

```typescript
// This fails because the shops table doesn't exist yet
const savedShop = await upsertShop(shop, tokenData.access_token);
```

The migration SQL file (`database/001_initial_schema.sql`) defines all the tables, but it hasn't been executed in your Supabase database yet.

---

## What Gets Created

| Table | Purpose | Key Field |
|-------|---------|-----------|
| `shops` | Shopify store data | `shop_domain` (unique) |
| `calls` | Voice call records | `vapi_call_id` |
| `products` | Cached Shopify products | `shopify_product_id` |
| `call_actions` | Actions during calls | `call_id` (FK) |

---

## Shops Table Fields

```typescript
{
  id: UUID,                    // Auto-generated, unique ID
  shop_domain: string,         // e.g., "my-store.myshopify.com" (unique)
  access_token: string,        // OAuth token from Shopify
  shop_name?: string,          // Store name
  email?: string,              // Owner email
  timezone: string,            // Default: 'UTC'
  phone_number?: string,
  vapi_assistant_id?: string,  // AI assistant ID
  settings: JSON,              // Flexible config object
  subscription_status: 'trial' | 'active' | 'cancelled' | 'suspended',
  plan_name: string,           // Default: 'starter'
  call_minutes_limit: number,  // Default: 100
  installed_at: timestamp,
  created_at: timestamp,
  updated_at: timestamp,       // Auto-updated
}
```

---

## OAuth Callback → Database Save

```typescript
// 1. User completes OAuth
// 2. Shopify redirects to: /api/auth/callback?code=...&shop=...

// 3. Our code exchanges code for token
const tokenData = await exchangeCodeForToken(shop, code);

// 4. Our code saves shop to database
const savedShop = await upsertShop(
  shop,                        // "my-store.myshopify.com"
  tokenData.access_token,      // OAuth access token
  {
    subscription_status: 'trial',
    plan_name: 'starter',
    call_minutes_limit: 100,
    installed_at: new Date().toISOString(),
  }
);

// 5. Shop saved! User is logged in
console.log('Shop saved:', savedShop.id);
```

---

## Environment Variables

Your `.env` file needs:

```env
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get these from:
1. https://supabase.com/dashboard/projects
2. Select your project
3. Settings → API
4. Copy "Project URL" and "anon (public)" key

---

## Common Issues

| Error | Fix |
|-------|-----|
| `Could not find the table 'public.shops'` | Run migration SQL (see above) |
| `Permission denied` | Run SQL as admin role, not anon |
| `relation shops already exists` | Table already created (safe to ignore) |
| `undefined reference to shops.id` | Run full migration (creates foreign keys) |

---

## Verify It Worked

### In Supabase Dashboard

**Check 1: Tables exist**
- Table Editor → should see 4 tables

**Check 2: Column structure**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'shops';
```

**Check 3: After OAuth test**
```sql
SELECT * FROM shops;  -- should see your test shop
```

---

## Code Changes Made

### Before (Broken)
```typescript
// Manually querying Supabase - fragile, incomplete
const shopDb = supabase.from('shops');
const { data: existingShop } = await shopDb.select('id').eq('domain', shop).single();
// ^ Wrong column name! Should be 'shop_domain', not 'domain'
```

### After (Fixed)
```typescript
// Using the proper database abstraction layer
import { upsertShop } from '@/lib/supabase/db';

const savedShop = await upsertShop(shop, tokenData.access_token, {
  subscription_status: 'trial',
  plan_name: 'starter',
  call_minutes_limit: 100,
  installed_at: new Date().toISOString(),
});
```

The `upsertShop()` function handles:
- ✅ Correct column names
- ✅ Proper data types and validation
- ✅ Create or update logic
- ✅ Error handling

---

## Next Steps

1. ✅ Run the migration SQL
2. ✅ Verify tables exist
3. ✅ Test OAuth flow end-to-end
4. ✅ Check that shop is saved to database
5. ✅ Check console logs: `[Callback] Shop upserted successfully`

---

## References

- Full setup guide: `docs/DATABASE_SETUP.md`
- HMAC validation fix: `docs/HMAC_VALIDATION_FIX.md`
- Initial schema: `database/001_initial_schema.sql`
- DB functions: `src/lib/supabase/db.ts`
- Callback handler: `src/app/api/auth/callback/route.ts`
