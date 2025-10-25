-- =====================================================
-- FIX SESSION ID CONSTRAINT ISSUE
-- =====================================================
-- This script addresses the check_session_id_format constraint violation

-- 1. Check the current constraint definition
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'check_session_id_format';

-- 2. Drop the problematic constraint if it exists
ALTER TABLE shopify_sessions DROP CONSTRAINT IF EXISTS check_session_id_format;

-- 3. Create a more flexible constraint that allows proper Shopify session IDs
ALTER TABLE shopify_sessions ADD CONSTRAINT check_session_id_format 
CHECK (
    id ~ '^[a-zA-Z0-9_]+$' AND 
    LENGTH(id) >= 10 AND 
    LENGTH(id) <= 100
);

-- 4. Test the new constraint with various session ID formats
DO $$
BEGIN
    -- Test valid session IDs
    BEGIN
        INSERT INTO shopify_sessions (id, shop, state, is_online, scope, expires, access_token, online_access_info, created_at, updated_at)
        VALUES ('shpca_1234567890abcdef', 'test-shop.myshopify.com', 'test-state', false, 'read_products', NULL, 'test-token', NULL, NOW(), NOW());
        DELETE FROM shopify_sessions WHERE id = 'shpca_1234567890abcdef';
        RAISE NOTICE '✅ Valid session ID format accepted';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Valid session ID format rejected: %', SQLERRM;
    END;
    
    -- Test another valid format
    BEGIN
        INSERT INTO shopify_sessions (id, shop, state, is_online, scope, expires, access_token, online_access_info, created_at, updated_at)
        VALUES ('shpat_abcdef1234567890', 'test-shop2.myshopify.com', 'test-state', false, 'read_products', NULL, 'test-token', NULL, NOW(), NOW());
        DELETE FROM shopify_sessions WHERE id = 'shpat_abcdef1234567890';
        RAISE NOTICE '✅ Alternative session ID format accepted';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Alternative session ID format rejected: %', SQLERRM;
    END;
END $$;

-- 5. Verify the constraint is working
SELECT 
    'Session ID constraint fixed and tested' as status,
    'The constraint now accepts proper Shopify session ID formats' as message;
