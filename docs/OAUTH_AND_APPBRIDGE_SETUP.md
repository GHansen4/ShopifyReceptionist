# OAuth and App Bridge Configuration Guide

Complete guide for Shopify OAuth authentication and App Bridge setup for production deployment.

---

## ✅ What We've Implemented

### 1. OAuth Callback Route (`/api/auth/callback`)

**Location:** `src/app/api/auth/callback/route.ts`

**Features:**
- ✅ **HMAC Validation:** Verifies request authenticity using SHA256 HMAC
- ✅ **State Validation:** Prevents CSRF attacks using state parameter
- ✅ **Code Exchange:** Exchanges authorization code for access token
- ✅ **Session Storage:** Stores session in Supabase using Shopify's session format
- ✅ **Shop Metadata:** Saves shop info to `shops` table
- ✅ **Secure Redirect:** Redirects back to app with shop and host parameters
- ✅ **Cookie Cleanup:** Clears OAuth cookies after successful authorization

**Flow:**
```
1. User clicks "Install" on Shopify
2. Shopify redirects to /api/auth/callback?code=...&hmac=...&shop=...&state=...
3. Validate HMAC (ensures request is from Shopify)
4. Validate state (ensures no CSRF)
5. Exchange code for access token via Shopify API
6. Store session in Supabase (SupabaseSessionStorage)
7. Store shop metadata in shops table
8. Redirect to app homepage with shop parameter
```

**Security Measures:**
- HMAC validation prevents request forgery
- State parameter prevents CSRF attacks
- Cookies are httpOnly and secure in production
- Access tokens stored server-side only

---

### 2. OAuth Initiation Route (`/api/auth`)

**Location:** `src/app/api/auth/route.ts`

**Features:**
- ✅ **Manual OAuth Construction:** Built for Next.js App Router compatibility
- ✅ **State Generation:** Creates cryptographically secure state parameter
- ✅ **Cookie Storage:** Stores state and shop in secure cookies
- ✅ **Redirect URI:** Uses production Vercel URL from environment
- ✅ **Rate Limiting:** Protected with rate limiter middleware

**Flow:**
```
1. User accesses app without session
2. Middleware redirects to /api/auth?shop=<shop-domain>
3. Generate state and nonce for security
4. Construct OAuth authorization URL
5. Store state in cookies
6. Redirect to Shopify authorization page
7. User approves → redirects to /api/auth/callback
```

**Configuration:**
```typescript
const redirectUri = `${env.SHOPIFY_APP_URL}/api/auth/callback`;
const scopes = env.SHOPIFY_SCOPES;

const authUrl = new URL(`https://${shopDomain}/admin/oauth/authorize`);
authUrl.searchParams.set('client_id', env.SHOPIFY_API_KEY);
authUrl.searchParams.set('scope', scopes);
authUrl.searchParams.set('redirect_uri', redirectUri);
authUrl.searchParams.set('state', state);
```

---

### 3. App Bridge Provider

**Location:** `src/components/providers/AppBridgeProvider.tsx`

**Features:**
- ✅ **Automatic Detection:** Detects embedded vs. standalone mode
- ✅ **Parameter Extraction:** Extracts host and shop from URL
- ✅ **App Bridge Initialization:** Uses @shopify/app-bridge-react Provider
- ✅ **Suspense Boundary:** Properly wrapped for Next.js App Router
- ✅ **Graceful Degradation:** Works without App Bridge if not embedded
- ✅ **Development Logging:** Helpful debug logs in development mode

**Implementation:**
```typescript
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';

// Initialize App Bridge when embedded
<AppBridgeProvider
  config={{
    apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
    host: host, // From URL parameter
    forceRedirect: false,
  }}
>
  {children}
</AppBridgeProvider>
```

**How it Works:**
1. Checks if app is embedded: `window.self !== window.top`
2. Extracts `host` parameter from URL
3. Gets API key from environment: `NEXT_PUBLIC_SHOPIFY_API_KEY`
4. Initializes App Bridge if all requirements met
5. Falls back to standalone mode if not embedded

---

## 🔧 Configuration Checklist

### Step 1: shopify.app.toml Configuration

**File:** `shopify.app.toml`

```toml
# Production URL (Vercel)
application_url = "https://shopify-receptionist.vercel.app"
embedded = true

[auth]
redirect_urls = [
  # Production (Vercel)
  "https://shopify-receptionist.vercel.app/api/auth/callback",
  "https://shopify-receptionist.vercel.app/api/auth",
  # Local development
  "https://localhost:3000/api/auth/callback",
]
```

**Status:** ✅ Configured

---

### Step 2: Environment Variables

**Required for OAuth and App Bridge:**

```bash
# Server-side (OAuth)
SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5
SHOPIFY_API_SECRET=shpss_YOUR_SECRET_HERE
SHOPIFY_SCOPES=read_customers,read_orders,read_products
NEXT_PUBLIC_APP_URL=https://shopify-receptionist.vercel.app

# Client-side (App Bridge)
NEXT_PUBLIC_SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5
```

**Critical:** 
- `NEXT_PUBLIC_SHOPIFY_API_KEY` **must equal** `SHOPIFY_API_KEY`
- Without `NEXT_PUBLIC_SHOPIFY_API_KEY`, App Bridge won't initialize

**Status:** ⏳ **Needs to be set in Vercel**

---

### Step 3: Vercel Configuration

**Add to Vercel Dashboard:**

1. Go to: https://vercel.com → Your Project → Settings → Environment Variables

2. Add these variables for **Production** environment:

```bash
SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5
SHOPIFY_API_SECRET=shpss_YOUR_SECRET_HERE
SHOPIFY_SCOPES=read_customers,read_orders,read_products
NEXT_PUBLIC_APP_URL=https://shopify-receptionist.vercel.app
NEXT_PUBLIC_SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5
NODE_ENV=production

# Also add Supabase and Vapi variables (see ENVIRONMENT_VARIABLES.md)
```

3. **Redeploy** after adding variables:
   - Deployments tab → Latest deployment → ⋯ → Redeploy

**Status:** ⏳ **Pending - Do this next**

---

## 🧪 Testing OAuth and App Bridge

### Test 1: OAuth Flow

**Steps:**
1. Go to: https://always-ai-dev-store.myshopify.com/admin
2. Click **Apps** in sidebar
3. Click your app name
4. If prompted, click **Install** or **Authorize**

**Expected Result:**
```
1. Redirects to Shopify authorization page
2. Shows requested scopes
3. Click "Install app"
4. Redirects to /api/auth/callback
5. Validates HMAC ✅
6. Validates state ✅
7. Exchanges code for token ✅
8. Stores session ✅
9. Redirects to app homepage ✅
```

**Check Logs:**
```bash
# Vercel → Functions → Real-time logs
[OAuth] Initiating OAuth flow for shop: always-ai-dev-store.myshopify.com
[OAuth] ✅ Redirecting to Shopify
[OAuth Callback] Processing OAuth callback for shop: always-ai-dev-store.myshopify.com
[OAuth Callback] ✅ HMAC validated
[OAuth Callback] ✅ State validated
[OAuth Callback] ✅ Access token received
[OAuth Callback] ✅ Session stored in Supabase
[OAuth Callback] ✅ Shop metadata stored
[OAuth Callback] Redirecting to app home page
```

---

### Test 2: App Bridge Initialization

**Steps:**
1. Load app from Shopify Admin (already installed)
2. Open browser console (F12)
3. Look for App Bridge logs

**Expected Result:**
```javascript
[AppBridge] Initializing in embedded mode
[AppBridge] Shop: always-ai-dev-store.myshopify.com
[AppBridge] Host: present
[AppBridge] API Key: configured
```

**If you see:**
```javascript
[AppBridge] ❌ Missing NEXT_PUBLIC_SHOPIFY_API_KEY environment variable
```

**Fix:** Add `NEXT_PUBLIC_SHOPIFY_API_KEY` to Vercel and redeploy

---

### Test 3: Session Persistence

**Steps:**
1. Navigate around the app (Dashboard → Calls → Settings)
2. Refresh the page
3. App should stay logged in (no re-authorization)

**Expected Result:**
- No OAuth redirect on refresh
- Session loaded from Supabase
- App functions normally

**Check:**
```sql
-- In Supabase SQL Editor
SELECT * FROM shopify_sessions 
WHERE shop = 'always-ai-dev-store.myshopify.com';

-- Should see:
-- id: offline_always-ai-dev-store.myshopify.com
-- is_online: false
-- access_token: shpat_...
-- expires: null (offline sessions don't expire)
```

---

## 🐛 Troubleshooting

### Issue: "Invalid redirect_uri"

**Symptom:**
```
OAuth error: invalid_request
The redirect_uri is not whitelisted
```

**Cause:** Redirect URL in request doesn't match `shopify.app.toml`

**Fix:**
1. Check `/api/auth/route.ts` line 55:
   ```typescript
   const redirectUri = `${env.SHOPIFY_APP_URL}/api/auth/callback`;
   ```
2. Check `shopify.app.toml` redirect_urls includes this exact URL
3. Ensure `NEXT_PUBLIC_APP_URL` in Vercel matches Vercel deployment URL
4. No trailing slashes!

---

### Issue: "Invalid HMAC"

**Symptom:**
```json
{ "error": "Invalid HMAC - request not from Shopify" }
```

**Cause:** HMAC validation failed, or wrong secret

**Fix:**
1. Verify `SHOPIFY_API_SECRET` in Vercel matches Partner Dashboard
2. Check if URL was tampered with
3. Ensure all query parameters are included in HMAC check
4. Code properly sorts params and excludes `hmac` and `signature`

**HMAC Validation Code:**
```typescript
const params = new URLSearchParams(searchParams);
params.delete('hmac');
params.delete('signature');
const message = params.toString();

const generatedHmac = crypto
  .createHmac('sha256', env.SHOPIFY_API_SECRET)
  .update(message)
  .digest('hex');

if (generatedHmac !== hmac) {
  // Invalid!
}
```

---

### Issue: "OAuth state not found"

**Symptom:**
```json
{ "error": "OAuth state not found - session may have expired" }
```

**Cause:** Cookie expired or wasn't set

**Fix:**
1. Check cookie settings in `/api/auth/route.ts`
2. Ensure cookies are `sameSite: 'lax'` (not 'strict')
3. Check `secure: true` only in production
4. OAuth flow must complete within 10 minutes (maxAge: 600)

---

### Issue: App Bridge Not Initializing

**Symptom:**
```javascript
[AppBridge] ❌ Missing NEXT_PUBLIC_SHOPIFY_API_KEY environment variable
```

**Cause:** Missing client-side API key

**Fix:**
1. Add to Vercel: `NEXT_PUBLIC_SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5`
2. Must be **exact same value** as `SHOPIFY_API_KEY`
3. Redeploy after adding
4. Clear browser cache and reload

---

### Issue: "Refused to display in a frame"

**Symptom:**
```
Refused to display 'https://your-app.vercel.app' in a frame because it set 'X-Frame-Options' to 'deny'.
```

**Cause:** CSP headers blocking iframe embedding

**Fix:**
Already configured in `next.config.js`:
```javascript
headers: {
  'Content-Security-Policy': "frame-ancestors https://*.myshopify.com https://admin.shopify.com;",
  'X-Frame-Options': 'ALLOW-FROM https://admin.shopify.com',
}
```

If still seeing error, check Vercel logs for CSP warnings.

---

### Issue: Session Not Persisting

**Symptom:** App keeps asking to re-authorize

**Cause:** Session not being stored or retrieved from Supabase

**Fix:**
1. Check Supabase connection: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
2. Verify `shopify_sessions` table exists
3. Check if session is being stored:
   ```sql
   SELECT * FROM shopify_sessions;
   ```
4. Check middleware is loading session correctly
5. Verify `SupabaseSessionStorage` is working

---

## 📊 OAuth Flow Diagram

```
┌─────────────────┐
│  User Access    │
│   Shopify Admin │
│   (no session)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Middleware     │
│  Detects no     │
│  session        │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  /api/auth?shop=...     │
│  - Generate state       │
│  - Store in cookies     │
│  - Build OAuth URL      │
│  - Redirect to Shopify  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Shopify Auth Page      │
│  - Shows scopes         │
│  - User clicks Install  │
└────────┬────────────────┘
         │
         ▼
┌───────────────────────────────┐
│  /api/auth/callback           │
│  ?code=...&hmac=...           │
│  &shop=...&state=...          │
│  - Validate HMAC ✅           │
│  - Validate state ✅          │
│  - Exchange code for token ✅ │
│  - Store session ✅           │
│  - Store shop metadata ✅     │
│  - Redirect to app ✅         │
└────────┬──────────────────────┘
         │
         ▼
┌─────────────────┐
│  App Homepage   │
│  (authenticated)│
│  with App Bridge│
└─────────────────┘
```

---

## 📚 Related Documentation

- [`ENVIRONMENT_VARIABLES.md`](ENVIRONMENT_VARIABLES.md) - Environment configuration
- [`SHOPIFY_CONFIG_UPDATE_GUIDE.md`](SHOPIFY_CONFIG_UPDATE_GUIDE.md) - TOML configuration
- [`PRODUCTION_DEPLOYMENT_CHECKLIST.md`](PRODUCTION_DEPLOYMENT_CHECKLIST.md) - Deployment steps
- [Shopify OAuth Documentation](https://shopify.dev/docs/apps/auth/oauth)
- [App Bridge Documentation](https://shopify.dev/docs/api/app-bridge-library)

---

## ✅ Verification Checklist

After completing all configuration:

### OAuth:
- [ ] `shopify.app.toml` has production URL
- [ ] `shopify.app.toml` redirect URLs include callback
- [ ] `SHOPIFY_API_KEY` set in Vercel
- [ ] `SHOPIFY_API_SECRET` set in Vercel
- [ ] `SHOPIFY_SCOPES` set in Vercel
- [ ] `NEXT_PUBLIC_APP_URL` set in Vercel
- [ ] Redeployed after adding variables
- [ ] Can install app from Shopify Admin
- [ ] OAuth completes successfully
- [ ] Session persists after refresh

### App Bridge:
- [ ] `NEXT_PUBLIC_SHOPIFY_API_KEY` set in Vercel
- [ ] Value matches `SHOPIFY_API_KEY` exactly
- [ ] Redeployed after adding variable
- [ ] App Bridge initializes (check console logs)
- [ ] App loads in Shopify Admin iframe
- [ ] No CSP/X-Frame-Options errors
- [ ] Navigation works within iframe

---

## 🎉 Summary

### What's Working:
1. ✅ **OAuth Callback** - Fully implemented with HMAC and state validation
2. ✅ **OAuth Initiation** - Manual OAuth construction for App Router compatibility
3. ✅ **App Bridge Provider** - Properly configured with @shopify/app-bridge-react
4. ✅ **Session Storage** - Supabase-backed session persistence
5. ✅ **Security** - CSRF protection, HMAC validation, secure cookies

### What's Needed:
1. ⏳ **Set environment variables in Vercel** (especially `NEXT_PUBLIC_SHOPIFY_API_KEY`)
2. ⏳ **Redeploy after adding variables**
3. ⏳ **Test OAuth flow in production**
4. ⏳ **Verify App Bridge initialization**

**Next Step:** Configure Vercel environment variables (see [`ENVIRONMENT_VARIABLES.md`](ENVIRONMENT_VARIABLES.md))

