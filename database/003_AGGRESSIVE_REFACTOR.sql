-- ============================================================================
-- AGGRESSIVE DATABASE REFACTOR - SHOPIFY 2025 COMPLIANCE
-- ============================================================================
-- Purpose: Complete database restructure following Shopify and Supabase best practices
-- 
-- This script will:
-- 1. DROP all existing tables and data (DESTRUCTIVE)
-- 2. Recreate with proper Shopify 2025 patterns
-- 3. Implement correct session management
-- 4. Add proper RLS policies
-- 5. Ensure Vapi integration works
-- 
-- ⚠️  WARNING: This will DELETE ALL DATA
-- ⚠️  Only run this in development/staging environments
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING STRUCTURES (DESTRUCTIVE)
-- ============================================================================

-- Drop all tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS call_actions CASCADE;
DROP TABLE IF EXISTS calls CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS shops CASCADE;
DROP TABLE IF EXISTS shopify_sessions CASCADE;

-- Drop all custom types
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS call_sentiment CASCADE;
DROP TYPE IF EXISTS resolution_status CASCADE;
DROP TYPE IF EXISTS action_type CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_shopify_sessions_updated_at() CASCADE;

-- ============================================================================
-- STEP 2: RECREATE WITH SHOPIFY 2025 COMPLIANCE
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- STEP 3: SHOPIFY SESSIONS TABLE (PRIMARY AUTH)
-- ============================================================================
-- This is the PRIMARY authentication table following Shopify's patterns
-- All OAuth tokens are managed here by @shopify/shopify-api

CREATE TABLE shopify_sessions (
  id VARCHAR(255) PRIMARY KEY,                    -- Session ID (offline_<shop> or online_<shop>_<user>)
  shop VARCHAR(255) NOT NULL,                      -- Shop domain (normalized)
  state VARCHAR(255) NOT NULL,                    -- OAuth state for CSRF protection
  is_online BOOLEAN NOT NULL DEFAULT FALSE,       -- Online (per-user) vs Offline (per-shop)
  scope VARCHAR(255),                             -- Granted scopes
  expires TIMESTAMP WITH TIME ZONE,               -- Token expiration (NULL for offline tokens)
  access_token TEXT NOT NULL,                     -- Shopify access token
  online_access_info JSONB,                      -- Additional info for online tokens
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 4: BUSINESS DATA TABLES
-- ============================================================================

-- Create enums for business logic
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'cancelled', 'suspended');
CREATE TYPE call_sentiment AS ENUM ('positive', 'neutral', 'negative');
CREATE TYPE resolution_status AS ENUM ('resolved', 'escalated', 'abandoned');
CREATE TYPE action_type AS ENUM ('order_lookup', 'product_search', 'transfer_attempt');

-- Shops table (business data only - NO auth tokens)
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_domain VARCHAR(255) NOT NULL UNIQUE,       -- Normalized shop domain
  shop_name VARCHAR(255),                         -- Display name
  email VARCHAR(255),                             -- Contact email
  timezone VARCHAR(50) DEFAULT 'UTC',            -- Shop timezone
  phone_number VARCHAR(50),                       -- Shop phone number
  
  -- Vapi Integration
  vapi_assistant_id VARCHAR(255) UNIQUE,          -- Vapi assistant ID (CRITICAL for functions)
  vapi_phone_number_id VARCHAR(255),             -- Vapi phone number ID
  provisioned_phone_number VARCHAR(50),           -- Provisioned phone number
  
  -- Business Settings
  settings JSONB DEFAULT '{"language":"en","timezone":"UTC","greeting":"","hold_message":""}'::jsonb,
  
  -- Subscription Management
  subscription_status subscription_status DEFAULT 'trial',
  subscription_id VARCHAR(255),
  plan_name VARCHAR(50) DEFAULT 'starter',
  call_minutes_used INTEGER DEFAULT 0,
  call_minutes_limit INTEGER DEFAULT 100,
  
  -- Timestamps
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calls table
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  vapi_call_id VARCHAR(255) NOT NULL UNIQUE,
  customer_phone VARCHAR(50) NOT NULL,
  customer_name VARCHAR(255),
  duration_seconds INTEGER DEFAULT 0,
  cost_cents INTEGER DEFAULT 0,
  recording_url TEXT,
  transcript JSONB,
  summary TEXT,
  sentiment call_sentiment DEFAULT 'neutral',
  resolution_status resolution_status DEFAULT 'abandoned',
  tags TEXT[],
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call actions table
CREATE TABLE call_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  action_type action_type NOT NULL,
  action_data JSONB,
  success BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table (cached from Shopify)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  shopify_product_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  inventory_quantity INTEGER DEFAULT 0,
  image_url TEXT,
  product_url TEXT,
  variants JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 5: PERFORMANCE INDEXES
-- ============================================================================

-- Shopify sessions indexes
CREATE INDEX idx_shopify_sessions_shop ON shopify_sessions(shop);
CREATE INDEX idx_shopify_sessions_expires ON shopify_sessions(expires) WHERE expires IS NOT NULL;
CREATE INDEX idx_shopify_sessions_online ON shopify_sessions(is_online);

-- Shops indexes
CREATE INDEX idx_shops_domain ON shops(shop_domain);
CREATE INDEX idx_shops_vapi_assistant ON shops(vapi_assistant_id);
CREATE INDEX idx_shops_phone ON shops(phone_number);
CREATE INDEX idx_shops_provisioned_phone ON shops(provisioned_phone_number);

-- Calls indexes
CREATE INDEX idx_calls_shop_id ON calls(shop_id);
CREATE INDEX idx_calls_vapi_call_id ON calls(vapi_call_id);
CREATE INDEX idx_calls_shop_started ON calls(shop_id, started_at DESC);
CREATE INDEX idx_calls_customer_phone ON calls(customer_phone);

-- Call actions indexes
CREATE INDEX idx_call_actions_call_id ON call_actions(call_id);
CREATE INDEX idx_call_actions_type ON call_actions(action_type);

-- Products indexes
CREATE INDEX idx_products_shop_id ON products(shop_id);
CREATE INDEX idx_products_shopify_id ON products(shopify_product_id);
CREATE INDEX idx_products_shop_title ON products(shop_id, title);

-- ============================================================================
-- STEP 6: TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopify_sessions_updated_at BEFORE UPDATE ON shopify_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 7: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE shopify_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 8: RLS POLICIES
-- ============================================================================

-- Shopify sessions policies (service role only)
CREATE POLICY "Service role manages sessions" ON shopify_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Shops policies
CREATE POLICY "Service role manages shops" ON shops
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Calls policies (through shop_id)
CREATE POLICY "Service role manages calls" ON calls
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Call actions policies
CREATE POLICY "Service role manages call_actions" ON call_actions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Products policies
CREATE POLICY "Service role manages products" ON products
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 9: PERMISSIONS
-- ============================================================================

-- Grant all permissions to service_role (for server-side operations)
GRANT ALL ON shopify_sessions TO service_role;
GRANT ALL ON shops TO service_role;
GRANT ALL ON calls TO service_role;
GRANT ALL ON call_actions TO service_role;
GRANT ALL ON products TO service_role;

-- Grant limited permissions to authenticated role (for client-side operations)
GRANT SELECT ON shops TO authenticated;
GRANT SELECT ON calls TO authenticated;
GRANT SELECT ON call_actions TO authenticated;
GRANT SELECT ON products TO authenticated;

-- ============================================================================
-- STEP 10: DATA INTEGRITY CONSTRAINTS
-- ============================================================================

-- Ensure shop_domain is normalized
ALTER TABLE shops ADD CONSTRAINT check_shop_domain_format 
  CHECK (shop_domain ~ '^[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]\.myshopify\.com$');

-- Ensure phone numbers are valid format
ALTER TABLE shops ADD CONSTRAINT check_phone_format 
  CHECK (phone_number IS NULL OR phone_number ~ '^\+?[1-9]\d{1,14}$');

ALTER TABLE shops ADD CONSTRAINT check_provisioned_phone_format 
  CHECK (provisioned_phone_number IS NULL OR provisioned_phone_number ~ '^\+?[1-9]\d{1,14}$');

-- Ensure Vapi assistant ID is unique
ALTER TABLE shops ADD CONSTRAINT check_vapi_assistant_unique 
  CHECK (vapi_assistant_id IS NOT NULL);

-- ============================================================================
-- STEP 11: COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE shopify_sessions IS 'Primary authentication table - managed by @shopify/shopify-api';
COMMENT ON TABLE shops IS 'Business data table - contains Vapi integration and shop metadata';
COMMENT ON TABLE calls IS 'Call logs and analytics';
COMMENT ON TABLE call_actions IS 'Individual actions taken during calls';
COMMENT ON TABLE products IS 'Cached product data from Shopify';

COMMENT ON COLUMN shops.vapi_assistant_id IS 'CRITICAL: Must be populated for Vapi functions to work';
COMMENT ON COLUMN shops.shop_domain IS 'Normalized shop domain (e.g., store.myshopify.com)';

-- ============================================================================
-- STEP 12: VERIFICATION QUERIES
-- ============================================================================

-- Check table structure
-- SELECT table_name, column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
-- ORDER BY table_name, ordinal_position;

-- Check indexes
-- SELECT indexname, tablename, indexdef 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, indexname;

-- Check RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, policyname;

-- ============================================================================
-- END OF AGGRESSIVE REFACTOR
-- ============================================================================

-- ============================================================================
-- POST-REFACTOR VERIFICATION
-- ============================================================================

-- Run these queries to verify the refactor worked:

-- 1. Check all tables exist
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- 2. Check shopify_sessions structure
-- \d shopify_sessions

-- 3. Check shops structure  
-- \d shops

-- 4. Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- 5. Check indexes
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public';

-- ============================================================================
-- NEXT STEPS AFTER REFACTOR
-- ============================================================================

-- 1. Test OAuth flow to populate shopify_sessions
-- 2. Test Vapi provisioning to populate shops.vapi_assistant_id
-- 3. Test Vapi functions to ensure shop lookup works
-- 4. Verify all API endpoints work with new structure

-- ============================================================================
-- ROLLBACK PLAN (if needed)
-- ============================================================================

-- If this refactor causes issues, you can restore from backup:
-- 1. Restore from Supabase backup
-- 2. Or run the original migration files in order
-- 3. Or contact support for database restoration

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
