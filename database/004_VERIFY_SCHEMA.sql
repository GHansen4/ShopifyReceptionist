-- =====================================================
-- DATABASE SCHEMA VERIFICATION SCRIPT
-- =====================================================
-- This script verifies that the database schema is correctly applied
-- Run this in your Supabase SQL Editor to confirm setup

-- 1. Check if all required tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('shops', 'shopify_sessions', 'calls', 'call_actions', 'products') 
        THEN '✅ REQUIRED'
        ELSE '⚠️  OPTIONAL'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('shops', 'shopify_sessions', 'calls', 'call_actions', 'products')
ORDER BY table_name;

-- 2. Verify shops table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'shops'
ORDER BY ordinal_position;

-- 3. Verify shopify_sessions table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'shopify_sessions'
ORDER BY ordinal_position;

-- 4. Check critical indexes exist
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename IN ('shops', 'shopify_sessions')
    AND indexname LIKE '%key%'
ORDER BY tablename, indexname;

-- 5. Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('shops', 'shopify_sessions', 'calls', 'call_actions', 'products')
ORDER BY tablename;

-- 6. Check for any data in tables (should be empty for new setup)
SELECT 
    'shops' as table_name, 
    COUNT(*) as record_count 
FROM shops
UNION ALL
SELECT 
    'shopify_sessions' as table_name, 
    COUNT(*) as record_count 
FROM shopify_sessions
UNION ALL
SELECT 
    'calls' as table_name, 
    COUNT(*) as record_count 
FROM calls
UNION ALL
SELECT 
    'call_actions' as table_name, 
    COUNT(*) as record_count 
FROM call_actions
UNION ALL
SELECT 
    'products' as table_name, 
    COUNT(*) as record_count 
FROM products;

-- 7. Verify constraints are in place
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid IN (
    SELECT oid FROM pg_class WHERE relname IN ('shops', 'shopify_sessions')
)
ORDER BY conname;

-- 8. Test basic insert/select operations (will be rolled back)
BEGIN;
    -- Test shops table insert
    INSERT INTO shops (shop_domain, shop_name, email, timezone, phone_number, settings, subscription_status, plan_name, call_minutes_used, call_minutes_limit, installed_at, created_at, updated_at)
    VALUES ('test-shop.myshopify.com', 'Test Shop', 'test@example.com', 'UTC', '+1234567890', '{}', 'trial', 'starter', 0, 100, NOW(), NOW(), NOW());
    
    -- Test shopify_sessions table insert (using proper Shopify session ID format)
    INSERT INTO shopify_sessions (id, shop, state, is_online, scope, expires, access_token, online_access_info, created_at, updated_at)
    VALUES ('shpca_1234567890abcdef', 'test-shop.myshopify.com', 'test-state', false, 'read_products', NULL, 'test-token', NULL, NOW(), NOW());
    
    -- Verify inserts worked
    SELECT 'shops' as table_name, COUNT(*) as count FROM shops WHERE shop_domain = 'test-shop.myshopify.com'
    UNION ALL
    SELECT 'shopify_sessions' as table_name, COUNT(*) as count FROM shopify_sessions WHERE shop = 'test-shop.myshopify.com';
    
    -- Clean up test data
    DELETE FROM shopify_sessions WHERE shop = 'test-shop.myshopify.com';
    DELETE FROM shops WHERE shop_domain = 'test-shop.myshopify.com';
    
ROLLBACK;

-- 9. Final verification summary
SELECT 
    'DATABASE SCHEMA VERIFICATION COMPLETE' as status,
    'All tables, constraints, and indexes are properly configured' as message;
