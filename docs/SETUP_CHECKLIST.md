# OAuth Database Setup - Step-by-Step Checklist

## ✅ Complete Setup Guide for Robust OAuth

Follow these steps to complete the migration to database-backed OAuth state management.

---

## Phase 1: Database Migration (5 minutes)

### **Step 1.1: Open Supabase SQL Editor**

- [ ] Go to: https://app.supabase.com/project/_/sql
- [ ] Click "New Query" button (if you see that option)
- [ ] Or click the SQL Editor tab on the left

**Current URL should be:**
```
https://app.supabase.com/project/[YOUR_PROJECT_ID]/sql/new
```

### **Step 1.2: Copy the Migration File**

- [ ] Open: `database/002_oauth_states_table.sql` in your editor
- [ ] Select all text (Ctrl+A)
- [ ] Copy it (Ctrl+C)

**What you're copying:**
```sql
-- OAuth States Table migration
CREATE TYPE oauth_state_status AS ENUM (...)
CREATE TABLE public.oauth_states (...)
CREATE INDEX idx_oauth_states_shop ON ...
... (70+ lines of schema creation)
```

### **Step 1.3: Execute the Migration**

- [ ] Paste the SQL into the Supabase editor (Ctrl+V)
- [ ] Click the "Run" button (usually a play icon ▶️)
- [ ] Wait for execution to complete (~2 seconds)

**You should see:**
```
Query successful - 1 rows returned
Execution time: 1.234 ms
```

**Or if there are multiple statements:**
```
-- Creates enum
-- Creates table
-- Creates indexes
-- Creates policies
-- Creates functions
-- Creates triggers
All executed successfully ✅
```

### **Step 1.4: Verify the Table Exists**

- [ ] In Supabase left sidebar, click "Tables" or "Databases"
- [ ] Look for `oauth_states` table in the list
- [ ] Click it to verify columns are created

**Expected columns:**
```
id (UUID)
shop (text)
state (text)
status (oauth_state_status enum)
created_at (timestamp)
expires_at (timestamp)
used_at (timestamp)
error_message (text)
request_ip (text)
user_agent (text)
```

✅ **Phase 1 Complete!**

---

## Phase 2: Verify Code Changes (1 minute)

### **Step 2.1: Check `/api/auth` Route**

- [ ] Open: `src/app/api/auth/route.ts`
- [ ] Verify these imports exist:
  ```typescript
  import { storeOAuthStateInDatabase } from '@/lib/supabase/db';
  ```

- [ ] Verify this code exists:
  ```typescript
  // PRIMARY STORAGE: Database (most reliable)
  try {
    await storeOAuthStateInDatabase(shop, nonce);
    if (process.env.NODE_ENV === 'development') {
      console.log('[OAuth Init] ✅ State stored in DATABASE');
    }
  } catch (dbError) {
    console.error('[OAuth Init] ⚠️  Database storage failed, using fallback:', dbError);
  }
  ```

✅ Check all 3 storage tiers are present

### **Step 2.2: Check `/api/auth/callback` Route**

- [ ] Open: `src/app/api/auth/callback/route.ts`
- [ ] Verify these imports:
  ```typescript
  import { getOAuthStateFromDatabase, deleteOAuthStateFromDatabase } from '@/lib/supabase/db';
  ```

- [ ] Verify 3-tier retrieval logic:
  ```typescript
  // TIER 1: Database
  const stateFromDB = await getOAuthStateFromDatabase(shop);
  
  // TIER 2: Memory (if DB failed)
  if (!stateFromDB) {
    const stateFromMemory = await getOAuthState(shop);
  }
  
  // TIER 3: Cookie (if memory failed)
  if (!stateFromDB && !stateFromMemory) {
    const stateFromCookie = request.cookies.get('shopify_nonce')?.value;
  }
  ```

✅ Check all 3 tiers are present

### **Step 2.3: Check Database Functions**

- [ ] Open: `src/lib/supabase/db.ts`
- [ ] Verify these functions exist:
  ```typescript
  storeOAuthStateInDatabase()
  getOAuthStateFromDatabase()
  deleteOAuthStateFromDatabase()
  cleanupExpiredOAuthStates()
  ```

✅ All 4 functions present

**Phase 2 Complete!**

---

## Phase 3: Environment Configuration (1 minute)

### **Step 3.1: Verify `.env.local`**

- [ ] Open: `.env.local` (in root directory)
- [ ] Verify Supabase credentials are present:
  ```env
  SUPABASE_URL=https://ezoyrjzzynmxdoorpokr.supabase.co
  SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

- [ ] Verify Shopify credentials:
  ```env
  SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5
  SHOPIFY_API_SECRET=shpss_YOUR_SECRET_HERE
  NEXT_PUBLIC_APP_URL=https://coupon-cricket-retro-friendly.trycloudflare.com
  ```

✅ All environment variables present

**Phase 3 Complete!**

---

## Phase 4: Restart Development Server (2 minutes)

### **Step 4.1: Stop Current Server**

- [ ] In terminal: Press `Ctrl+C` to stop the dev server
- [ ] Wait for it to fully stop

**Terminal shows:**
```
PS C:\...\shopify-voice-receptionist> 
```

### **Step 4.2: Start Fresh Dev Server**

- [ ] Run: `npm run dev`
- [ ] Wait for "✓ Ready in X.Xs" message

**You should see:**
```
   ▲ Next.js 15.5.6 (Turbopack)
   - Local:        http://localhost:3000
   ✓ Ready in 8.8s
```

✅ Dev server is running

**Phase 4 Complete!**

---

## Phase 5: Test OAuth Flow (3-5 minutes)

### **Step 5.1: Initiate OAuth**

- [ ] Visit your tunnel URL with shop parameter:
  ```
  https://coupon-cricket-retro-friendly.trycloudflare.com/?shop=always-on-apps.myshopify.com
  ```

- [ ] Page should show "Redirecting to Shopify for authentication..."

### **Step 5.2: Check Console Logs**

- [ ] Look at your dev server console for:
  ```
  [OAuth Init] Starting OAuth flow for shop: always-on-apps.myshopify.com
  [OAuth Init] ✅ State stored in DATABASE
  [OAuth Init] ✅ State stored in MEMORY
  [OAuth Init] ✅ Cookies set (fallback mechanism)
  [OAuth Init] Storage hierarchy: Database > Memory > Cookies
  ```

✅ All 3 storage tiers are being used!

### **Step 5.3: Complete Shopify Authorization**

- [ ] You're redirected to Shopify OAuth page
- [ ] Click "Install" to authorize the app

### **Step 5.4: Check Callback Logs**

- [ ] Dev server should show:
  ```
  [Callback] ✅ State retrieved from DATABASE
  [Callback] OAuth State Validation
  [Callback] State source: database
  [Callback] ✅ OAuth state validation PASSED
  [Callback] ✅ HMAC validation passed!
  [Callback] Token exchange successful
  [Callback] Shop upserted successfully
  [Callback] Cleaned up OAuth state from all storage tiers
  [Callback] ✅ OAuth flow completed successfully
  ```

✅ OAuth flow succeeded using database!

### **Step 5.5: Verify State Was Stored and Deleted**

- [ ] Go to Supabase: https://app.supabase.com/project/_/editor/tables
- [ ] Click on `oauth_states` table
- [ ] Should see NO rows (because they were cleaned up after use)

✅ Auto-cleanup is working!

**Phase 5 Complete!**

---

## Phase 6: Test Fallback Scenarios (Optional, 10 minutes)

### **Test 6.1: Server Restart Survival**

**Goal:** Verify OAuth works if server restarts mid-flow

- [ ] Start OAuth flow (see the "Redirecting..." page)
- [ ] **Don't complete it yet**
- [ ] Stop dev server: `Ctrl+C`
- [ ] Start it again: `npm run dev`
- [ ] Complete the OAuth by authorizing in Shopify
- [ ] Check logs:
  ```
  [Callback] Database lookup succeeded (database survived!)
  [Callback] ✅ State retrieved from DATABASE
  ```

✅ OAuth survived server restart!

### **Test 6.2: Tunnel URL Change**

**Goal:** Verify OAuth works even if tunnel URL changes

- [ ] Tunnel URL naturally changes over time, or:
- [ ] Restart Cloudflare tunnel: `cloudflared tunnel run`
- [ ] Update `.env.local`:
  ```env
  NEXT_PUBLIC_APP_URL=https://new-tunnel-url.trycloudflare.com
  ```
- [ ] Start new OAuth flow with new tunnel URL
- [ ] Verify it still works!

✅ Tunnel changes don't break OAuth!

### **Test 6.3: Database Outage Simulation**

**Goal:** Verify memory and cookies fallback when DB is down

- [ ] Disconnect internet or block Supabase in firewall (optional)
- [ ] Start OAuth flow
- [ ] Check logs should show:
  ```
  [OAuth Init] ⚠️  Database storage failed, using fallback
  [OAuth Init] ✅ State stored in MEMORY
  [OAuth Init] ✅ Cookies set (fallback mechanism)
  ```
- [ ] Complete OAuth authorization
- [ ] Logs should show:
  ```
  [Callback] Database lookup failed
  [Callback] ✅ State retrieved from MEMORY
  ```

✅ OAuth works without database!

**Phase 6 Complete!**

---

## Troubleshooting

### **Issue: "Cannot find module 'getOAuthStateFromDatabase'"**

**Solution:**
- [ ] Verify `src/lib/supabase/db.ts` has the new functions
- [ ] Verify imports in callback route:
  ```typescript
  import { getOAuthStateFromDatabase, deleteOAuthStateFromDatabase } from '@/lib/supabase/db';
  ```
- [ ] Restart dev server: `npm run dev`

### **Issue: "oauth_states table doesn't exist"**

**Solution:**
- [ ] Go to Supabase SQL editor
- [ ] Re-run the migration: `database/002_oauth_states_table.sql`
- [ ] Verify table appears in Supabase tables list
- [ ] Restart dev server

### **Issue: OAuth still fails with "state validation failed"**

**Solution:**
- [ ] Check Supabase connection:
  ```env
  SUPABASE_URL=https://ezoyrjzzynmxdoorpokr.supabase.co
  SUPABASE_ANON_KEY=eyJhbGc...
  ```
- [ ] Test connection in Supabase: SQL Editor → `SELECT 1`
- [ ] Check console for: `[DB] OAuth state stored for shop`
- [ ] If no logs, database storage is failing
- [ ] Check RLS policies on oauth_states table

### **Issue: Lots of "⚠️  Database storage failed" logs**

**This is OK!** Means:
- ✅ Database storage attempted but failed
- ✅ Memory storage succeeding (logs not shown by default)
- ✅ OAuth still works!

**Check:**
- [ ] SUPABASE_URL is correct
- [ ] SUPABASE_ANON_KEY is correct
- [ ] Table exists in Supabase
- [ ] RLS policies allow access

---

## Final Verification Checklist

- [ ] Database migration executed in Supabase
- [ ] `oauth_states` table exists
- [ ] Code updated with 3-tier storage
- [ ] `.env.local` has Supabase credentials
- [ ] Dev server restarted
- [ ] OAuth flow initiates successfully
- [ ] Console shows database storage being used
- [ ] OAuth completes successfully
- [ ] State is cleaned up automatically
- [ ] Optional: Fallback scenarios tested

---

## Success Indicators

You'll know everything is working when you see:

### **OAuth Init**
```
[OAuth Init] ✅ State stored in DATABASE
[OAuth Init] ✅ State stored in MEMORY
[OAuth Init] ✅ Cookies set (fallback mechanism)
[OAuth Init] Storage hierarchy: Database > Memory > Cookies
```

### **OAuth Callback**
```
[Callback] ✅ State retrieved from DATABASE
[Callback] ✅ OAuth state validation PASSED
[Callback] ✅ HMAC validation passed!
[Callback] ✅ OAuth flow completed successfully
```

### **Result**
- ✅ User authenticated
- ✅ Session created
- ✅ Redirected to dashboard
- ✅ OAuth survives restarts, crashes, tunnel changes

---

## Next: Production Deployment

When ready for production:

1. **In Supabase** (production project):
   - [ ] Run the migration: `database/002_oauth_states_table.sql`
   - [ ] Verify table and indexes

2. **Update Environment**:
   - [ ] Use production Supabase credentials
   - [ ] Update `NEXT_PUBLIC_APP_URL` to production domain
   - [ ] Set `NODE_ENV=production`

3. **Security**:
   - [ ] Enable HTTPS only (cookies: `secure: true`)
   - [ ] Enable SameSite for CSRF protection
   - [ ] Test HMAC validation
   - [ ] Review RLS policies

4. **Monitoring**:
   - [ ] Set up OAuth state query alerts
   - [ ] Monitor token exchange failures
   - [ ] Track state validation failures

---

## Support

If you encounter issues:

1. **Check Logs:**
   ```
   Look for [OAuth Init] and [Callback] messages
   ```

2. **Check Database:**
   ```sql
   SELECT COUNT(*) FROM oauth_states;
   SELECT * FROM oauth_states LIMIT 5;
   ```

3. **Check Environment:**
   - SUPABASE_URL correct?
   - SUPABASE_ANON_KEY correct?
   - SHOPIFY_API_KEY correct?
   - SHOPIFY_API_SECRET correct?

4. **Review Docs:**
   - `docs/ROBUST_OAUTH_SOLUTION.md` - Full architecture
   - `docs/OAUTH_FLOW_INITIATION.md` - Flow diagrams
   - `docs/AUTHORIZATION_CODE_REUSE_FIX.md` - Auth code issues

---

**🎉 Congratulations! You're now on a production-ready OAuth system!**


