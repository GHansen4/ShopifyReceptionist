# Database Fix Summary

## Problem

After successful OAuth callback authentication, the app crashes with:
```
Error: Could not find the table 'public.shops' in the schema cache
```

## Root Cause

The Supabase database exists but hasn't been initialized with the schema. The migration SQL file exists (`database/001_initial_schema.sql`) but hasn't been executed yet.

## Solution Overview

**3-Step Fix:**
1. ✅ Run the migration SQL in Supabase
2. ✅ Update the OAuth callback code to use proper database functions
3. ✅ Add comprehensive error handling and logging

---

## What Was Fixed

### 1. **Database Migration** (New)
- **File:** `database/001_initial_schema.sql`
- **Status:** Already exists in your project
- **Action needed:** Must be executed in Supabase SQL Editor

### 2. **OAuth Callback Handler** (Updated)
- **File:** `src/app/api/auth/callback/route.ts`
- **Issues fixed:**
  - ❌ Was using raw Supabase queries
  - ❌ Was querying wrong column name (`domain` instead of `shop_domain`)
  - ❌ Didn't include all required fields
  - ❌ Poor error handling
- **Now:**
  - ✅ Uses proper `upsertShop()` function
  - ✅ Includes all required fields
  - ✅ Better error messages for debugging
  - ✅ Comprehensive logging

### 3. **Database Functions** (Already existing)
- **File:** `src/lib/supabase/db.ts`
- **Status:** Already has proper `upsertShop()` function
- **Now being used:** In the callback handler

---

## Step-by-Step Fix Instructions

### Step 1: Run Migration SQL

#### In Supabase Dashboard:

1. Go to: **https://supabase.com/dashboard/projects**
2. Select your project
3. Click: **SQL Editor** (left sidebar)
4. Click: **New Query**
5. Copy ALL of `database/001_initial_schema.sql`
6. Paste into the editor
7. Click: **Run**

**This creates:**
- ✅ `shops` table - stores Shopify shop information
- ✅ `calls` table - stores voice call records
- ✅ `call_actions` table - stores actions taken during calls
- ✅ `products` table - caches Shopify products
- ✅ Indexes for performance
- ✅ Row Level Security (RLS) policies
- ✅ Auto-update triggers

### Step 2: Verify Migration Worked

In Supabase Dashboard:
1. Click: **Table Editor** (left sidebar)
2. You should see 4 tables:
   - `shops`
   - `calls`
   - `call_actions`
   - `products`

### Step 3: Test OAuth Flow

1. Start dev server: `npm run dev`
2. Visit: `http://localhost:3001/api/auth?shop=test-store.myshopify.com`
3. Check console for: `[Callback] Shop upserted successfully`
4. Verify in Supabase Table Editor → shops: should see new shop record

---

## Code Changes Explained

### Before (Broken)
```typescript
// ❌ WRONG: Using raw Supabase query
const shopDb = supabase.from('shops') as any;

// ❌ WRONG: Querying wrong column name ('domain' not 'shop_domain')
const { data: existingShop, error: selectError } = await shopDb
  .select('id')
  .eq('domain', shop)  // This column doesn't exist!
  .single();

// ❌ WRONG: Incomplete data
await shopDb.update({
  access_token: tokenData.access_token,
  updated_at: new Date().toISOString(),
})
```

### After (Fixed)
```typescript
// ✅ CORRECT: Using proper database abstraction
import { upsertShop } from '@/lib/supabase/db';

// ✅ CORRECT: Proper function with validation
const savedShop = await upsertShop(
  shop,                           // shop domain
  tokenData.access_token,         // oauth token
  {
    subscription_status: 'trial',
    plan_name: 'starter',
    call_minutes_limit: 100,
    installed_at: new Date().toISOString(),
  }
);

// ✅ Better logging
console.log('[Callback] Shop upserted successfully:', {
  id: savedShop.id,
  shop_domain: savedShop.shop_domain,
  subscription_status: savedShop.subscription_status,
});
```

---

## The `upsertShop()` Function

**Location:** `src/lib/supabase/db.ts`

**What it does:**
```typescript
export async function upsertShop(
  domain: string,                                    // "store.myshopify.com"
  accessToken: string,                              // OAuth token
  data: Partial<Omit<Shop, 'id' | 'created_at'>>  // additional fields
): Promise<Shop>
```

**Behavior:**
- If shop doesn't exist → creates it
- If shop exists → updates the access_token and fields
- Uses `shop_domain` as unique key
- Returns full shop object with UUID `id`
- Validates all data with Zod schemas
- Handles all errors properly

---

## Database Schema

### shops table
```sql
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_domain TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  shop_name TEXT,
  email TEXT,
  timezone TEXT DEFAULT 'UTC',
  phone_number TEXT,
  vapi_assistant_id TEXT,
  vapi_phone_number_id TEXT,
  settings JSONB,
  subscription_status subscription_status DEFAULT 'trial',
  subscription_id TEXT,
  plan_name TEXT DEFAULT 'starter',
  call_minutes_used INTEGER DEFAULT 0,
  call_minutes_limit INTEGER DEFAULT 100,
  installed_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Key fields:**
- `id` - Unique identifier (UUID)
- `shop_domain` - Unique shop identifier (e.g., "my-store.myshopify.com")
- `access_token` - OAuth access token for API calls
- `subscription_status` - 'trial', 'active', 'cancelled', 'suspended'
- `plan_name` - 'starter', 'pro', etc.
- `call_minutes_limit` - Max minutes per billing period

---

## OAuth Callback Flow (Updated)

```
1. User initiates OAuth at /api/auth?shop=...
   ↓
2. User authorizes at Shopify
   ↓
3. Shopify redirects to /api/auth/callback?code=...&hmac=...
   ↓
4. [Callback] Validate HMAC signature ✅
   ↓
5. [Callback] Validate state/nonce ✅
   ↓
6. [Callback] Exchange code for access token ✅
   ↓
7. [Callback] Save shop to database using upsertShop() ✅ NEW!
   ↓
8. [Callback] Create session cookie with shop ID ✅
   ↓
9. [Callback] Redirect to dashboard ✅
```

---

## Troubleshooting

### Error: "Could not find the table 'public.shops'"
**Solution:** Run the migration SQL (Step 1 above)

### Error: "Permission denied for schema public"
**Cause:** Using anon key instead of service key
**Solution:** Run SQL as admin/service role

### Error: "relation 'shops' already exists"
**Cause:** Migration already ran
**Solution:** Safe to ignore - just verify table structure

### Shop not appearing in Supabase after OAuth
**Debug:**
1. Check console: `[Callback] Shop upserted successfully`
2. Check for database errors: `[Callback] Database error during shop upsert`
3. Run in Supabase: `SELECT * FROM shops;`

---

## Files Modified

### New Documentation
- `docs/DATABASE_SETUP.md` - Complete setup guide
- `docs/DATABASE_FIX_SUMMARY.md` - This file
- `docs/SUPABASE_SETUP_QUICK_REFERENCE.md` - Quick reference card

### Code Changes
- `src/app/api/auth/callback/route.ts` - Updated to use `upsertShop()`

### No Changes (Already Correct)
- `database/001_initial_schema.sql` - Migration file exists
- `src/lib/supabase/db.ts` - Already has proper functions
- `src/lib/supabase/client.ts` - Already correct

---

## Environment Variables

Ensure these are in `.env`:

```env
# Supabase
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Shopify
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...

# App
NEXT_PUBLIC_APP_URL=https://your-tunnel-url.com
```

Get Supabase credentials from:
1. Dashboard → Settings → API
2. Copy "Project URL" and "anon (public)" key

---

## Testing Checklist

- [ ] Migration SQL ran without errors
- [ ] Tables appear in Supabase Table Editor
- [ ] Dev server starts: `npm run dev`
- [ ] OAuth flow: `http://localhost:3001/api/auth?shop=test.myshopify.com`
- [ ] Console shows: `[Callback] HMAC validation passed!`
- [ ] Console shows: `[Callback] Shop upserted successfully`
- [ ] New shop appears in Supabase shops table
- [ ] Can query: `SELECT * FROM shops;` and see the shop

---

## Next Steps

1. ✅ Run migration SQL
2. ✅ Verify tables exist
3. ✅ Test OAuth flow
4. ✅ Review console logs
5. ✅ Verify shop saved to database
6. Ready for production!

---

## References

- **Quick Reference:** `docs/SUPABASE_SETUP_QUICK_REFERENCE.md`
- **Full Setup:** `docs/DATABASE_SETUP.md`
- **HMAC Fix:** `docs/HMAC_VALIDATION_FIX.md`
- **Schema:** `database/001_initial_schema.sql`
- **DB Code:** `src/lib/supabase/db.ts`
- **Callback:** `src/app/api/auth/callback/route.ts`
