# Database Setup Guide

## Overview

This document explains how to set up your Supabase database for the Shopify Voice Receptionist app. The app requires a PostgreSQL database with several tables to store shop data, call records, and other information.

## Error: "Could not find the table 'public.shops' in the schema cache"

This error occurs when:
1. The `shops` table hasn't been created in your Supabase database
2. The migration SQL hasn't been executed
3. Your database credentials are pointing to the wrong database

## Quick Setup (Recommended)

### Step 1: Access Your Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/projects)
2. Select your project
3. Click **SQL Editor** in the left sidebar

### Step 2: Run the Migration SQL

1. Click **New Query**
2. Copy the entire content from `database/001_initial_schema.sql`
3. Paste it into the SQL editor
4. Click **Run**

The SQL will:
- Enable required PostgreSQL extensions (`uuid-ossp`, `pgcrypto`)
- Create all required tables:
  - `shops` - Shopify store information
  - `calls` - Voice call records
  - `call_actions` - Actions taken during calls
  - `products` - Synced Shopify products
- Create indexes for performance optimization
- Set up Row Level Security (RLS) policies
- Create triggers for automatic `updated_at` timestamps

### Step 3: Verify Table Creation

1. Click **Table Editor** in the left sidebar
2. You should see these tables:
   - `shops`
   - `calls`
   - `call_actions`
   - `products`

## Database Schema

### `shops` Table

Stores information about installed Shopify shops.

```sql
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_domain TEXT NOT NULL UNIQUE,        -- e.g., "my-store.myshopify.com"
  access_token TEXT NOT NULL,              -- OAuth access token
  shop_name TEXT,                          -- Shop display name
  email TEXT,                              -- Shop owner email
  timezone TEXT DEFAULT 'UTC',
  phone_number TEXT,
  vapi_assistant_id TEXT,                  -- Vapi AI assistant ID
  vapi_phone_number_id TEXT,               -- Vapi phone number ID
  settings JSONB,                          -- Flexible settings object
  subscription_status subscription_status,  -- 'trial', 'active', 'cancelled', 'suspended'
  subscription_id TEXT,
  plan_name TEXT DEFAULT 'starter',
  call_minutes_used INTEGER DEFAULT 0,
  call_minutes_limit INTEGER DEFAULT 100,
  installed_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_at TIMESTAMP
);
```

### `calls` Table

Records all incoming voice calls.

```sql
CREATE TABLE calls (
  id UUID PRIMARY KEY,
  shop_id UUID REFERENCES shops(id),
  vapi_call_id TEXT UNIQUE,                -- Vapi call identifier
  customer_phone TEXT,
  customer_name TEXT,
  duration_seconds INTEGER,
  cost_cents INTEGER,
  recording_url TEXT,
  transcript JSONB,
  summary TEXT,
  sentiment ENUM ('positive', 'neutral', 'negative'),
  resolution_status ENUM ('resolved', 'escalated', 'abandoned'),
  tags TEXT[],
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP
);
```

### `products` Table

Cached Shopify product data for quick access.

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  shop_id UUID REFERENCES shops(id),
  shopify_product_id TEXT,
  title TEXT,
  description TEXT,
  price DECIMAL,
  currency TEXT,
  inventory_quantity INTEGER,
  image_url TEXT,
  variants JSONB,
  updated_at TIMESTAMP,
  created_at TIMESTAMP
);
```

## Environment Variables Required

Ensure these are set in your `.env` file:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here  # (optional, for admin operations)
```

Get these from:
1. Supabase Dashboard → Settings → API
2. Look for "Project URL" and "anon (public)" key

## OAuth Callback Flow

When a user completes Shopify OAuth, the callback handler:

1. ✅ Validates the HMAC signature
2. ✅ Validates the state/nonce
3. ✅ Exchanges the authorization code for an access token
4. ✅ **Creates or updates the shop record** via `upsertShop()`
   ```typescript
   const savedShop = await upsertShop(shop, tokenData.access_token, {
     subscription_status: 'trial',
     plan_name: 'starter',
     call_minutes_limit: 100,
     installed_at: new Date().toISOString(),
   });
   ```

The `upsertShop()` function:
- Uses the `shop_domain` as the unique identifier
- Creates a new record if it doesn't exist
- Updates the access token if it does exist
- Returns the saved shop object with UUID `id`

## Troubleshooting

### Error: "Could not find the table 'public.shops'"

**Cause:** The migration SQL hasn't been run yet

**Solution:**
1. Go to Supabase SQL Editor
2. Run the migration SQL from `database/001_initial_schema.sql`
3. Verify the table exists in Table Editor

### Error: "Permission denied for schema public"

**Cause:** Your Supabase role doesn't have permissions

**Solution:**
1. Go to Supabase SQL Editor
2. Run as the admin/service role, not anon
3. Or use the service key in `.env`

### Error: "relation 'shops' already exists"

**Cause:** The table was already created from a previous run

**Solution:**
1. Comment out or skip the `CREATE TABLE` statements
2. Or drop the existing table first (if testing):
   ```sql
   DROP TABLE IF EXISTS shops CASCADE;
   ```

### Slow queries on calls table

**Solution:** Ensure indexes were created:
```sql
CREATE INDEX idx_calls_shop_id ON calls(shop_id);
CREATE INDEX idx_calls_shop_started ON calls(shop_id, started_at DESC);
```

## Row Level Security (RLS)

The database uses RLS policies to:
- Allow authenticated users to see only their own shop data
- Prevent one shop from accessing another shop's data
- Allow service_role (backend) to access all data

Current policies:
- `shops`: Users see only their own shop
- `calls`: Users see calls only from their shop
- `products`: Users see products only from their shop
- `call_actions`: Users see actions only from their shop's calls

## Connection String

If you need to connect directly (e.g., for migrations):

```
postgresql://postgres:[password]@[host]:[port]/postgres
```

Get from:
1. Supabase Dashboard → Settings → Database → Connection Pooling
2. Copy the "Session mode" connection string

## Production Checklist

- [ ] Database migration has been run
- [ ] All tables and indexes exist
- [ ] RLS policies are enabled
- [ ] Environment variables are set correctly
- [ ] Test OAuth flow completes successfully
- [ ] Shop data is saved to database
- [ ] Backup is configured in Supabase

## Useful Supabase Commands

### Check table structure
```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'shops';
```

### Check row counts
```sql
SELECT 
  'shops' as table_name, count(*) as rows FROM shops
UNION ALL
SELECT 'calls', count(*) FROM calls
UNION ALL
SELECT 'products', count(*) FROM products;
```

### Check indexes
```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'shops';
```

## References

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
