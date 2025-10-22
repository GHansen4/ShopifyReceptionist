-- ============================================================================
-- Migration 002: Shopify Sessions Table
-- ============================================================================
-- Purpose: Create session storage for Shopify OAuth tokens
-- 
-- This migration implements Shopify's prescribed session-based authentication
-- pattern. The Shopify API library (@shopify/shopify-api) uses this table to:
-- - Store OAuth sessions (replaces manual token management)
-- - Enable automatic token refresh
-- - Support Shopify CLI development workflow
-- - Allow horizontal scaling (shared session storage)
--
-- References:
-- - https://github.com/Shopify/shopify-api-js
-- - https://shopify.dev/docs/apps/build/authentication-authorization
-- ============================================================================

-- Create shopify_sessions table
-- This table stores Shopify OAuth sessions managed by @shopify/shopify-api
CREATE TABLE IF NOT EXISTS shopify_sessions (
  id VARCHAR(255) PRIMARY KEY,           -- Session ID (format: offline_<shop>)
  shop VARCHAR(255) NOT NULL,            -- Shop domain (e.g., store.myshopify.com)
  state VARCHAR(255) NOT NULL,           -- OAuth state for CSRF protection
  is_online BOOLEAN NOT NULL,            -- Online (per-user) vs Offline (per-shop) token
  scope VARCHAR(255),                    -- Granted scopes
  expires TIMESTAMP,                     -- Session expiration (NULL for offline tokens)
  access_token TEXT,                     -- Shopify access token (managed by library)
  online_access_info JSONB,              -- Additional info for online tokens
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopify_sessions_shop ON shopify_sessions(shop);
CREATE INDEX IF NOT EXISTS idx_shopify_sessions_expires ON shopify_sessions(expires) WHERE expires IS NOT NULL;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_shopify_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shopify_sessions_updated_at
  BEFORE UPDATE ON shopify_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_shopify_sessions_updated_at();

-- ============================================================================
-- Row Level Security (RLS) - Disabled for Sessions
-- ============================================================================
-- Sessions are managed by service role (SupabaseSessionStorage uses supabaseAdmin)
-- No RLS needed - sessions are internal to the app
ALTER TABLE shopify_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything (SupabaseSessionStorage uses service role key)
CREATE POLICY "Service role can manage sessions"
ON shopify_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- Cleanup: Remove access_token from shops table
-- ============================================================================
-- Access tokens are now stored in shopify_sessions (managed by Shopify library)
-- The shops table should only contain business logic data, not auth data
--
-- IMPORTANT: Uncomment this after verifying the new session-based auth works
-- ALTER TABLE shops DROP COLUMN IF EXISTS access_token;

-- For now, we keep it for backward compatibility during migration
-- You can drop it manually once you verify everything works

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE shopify_sessions IS 'Shopify OAuth sessions managed by @shopify/shopify-api library';
COMMENT ON COLUMN shopify_sessions.id IS 'Session ID format: offline_<shop> or online_<shop>_<userid>';
COMMENT ON COLUMN shopify_sessions.shop IS 'Shop domain (e.g., store.myshopify.com)';
COMMENT ON COLUMN shopify_sessions.state IS 'OAuth state for CSRF protection';
COMMENT ON COLUMN shopify_sessions.is_online IS 'true = online (per-user), false = offline (per-shop)';
COMMENT ON COLUMN shopify_sessions.access_token IS 'Shopify access token - managed by library, auto-refreshed';
COMMENT ON COLUMN shopify_sessions.online_access_info IS 'Additional metadata for online tokens (user info, etc.)';
COMMENT ON COLUMN shopify_sessions.expires IS 'Token expiration (NULL for offline tokens which don''t expire)';

-- ============================================================================
-- Verification Queries (for testing after migration)
-- ============================================================================
-- Check if table exists
-- SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'shopify_sessions');

-- Check session count
-- SELECT COUNT(*) FROM shopify_sessions;

-- View active sessions
-- SELECT shop, is_online, expires, created_at FROM shopify_sessions ORDER BY created_at DESC;

-- ============================================================================
-- End of Migration
-- ============================================================================

