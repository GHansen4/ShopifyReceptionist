# Token Exchange Debugging Guide

## The Error

```
Failed to exchange authorization code (502)
```

This error occurs after HMAC validation passes but before the shop is saved to the database. It means your app successfully received the OAuth callback from Shopify but failed to exchange the authorization code for an access token.

---

## What Happens in Token Exchange

```
1. User clicks "Install app" on Shopify
2. Shopify redirects to /api/auth/callback?code=...&shop=...&hmac=...
3. [✅ Callback validates HMAC]
4. [✅ Callback validates state/nonce]
5. [❌ Callback tries to exchange code for token - FAILS HERE]
6. Error: "Failed to exchange authorization code"
```

---

## Comprehensive Debug Logging

The token exchange function now logs everything:

### What You'll See in Console (Development Mode)

```
[Token Exchange] Starting token exchange...
[Token Exchange] Shop domain: my-store.myshopify.com
[Token Exchange] Code: 40cbe03761959d2b9...
[Token Exchange] API Key: a0563782e38f8...
[Token Exchange] API Secret: SET
[Token Exchange] Request URL: https://my-store.myshopify.com/admin/oauth/access_token
[Token Exchange] Request body: { client_id: "a0563782e...", client_secret: "***", code: "40cbe037..." }
[Token Exchange] Sending POST request to Shopify...
[Token Exchange] Response status: 200 OK
[Token Exchange] Response headers: { content-type: "application/json", ... }
[Token Exchange] Response body (parsed): { access_token: "shpat_...", expires_in: 86400, scope: "read_products,..." }
[Token Exchange] ✅ Token exchange successful!
[Token Exchange] Access token received: shpat_a1b2c3d4e5...
[Token Exchange] Expires in: 86400 seconds
[Token Exchange] Scope: read_products,read_orders,read_customers
```

---

## Common Issues & Fixes

### 1. "API credentials not configured"

**Error Log:**
```
[Token Exchange] ERROR: Missing Shopify API credentials!
[Token Exchange] API_KEY set: false
[Token Exchange] API_SECRET set: false
```

**Cause:** `SHOPIFY_API_KEY` or `SHOPIFY_API_SECRET` not in `.env`

**Fix:**
```env
SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5
SHOPIFY_API_SECRET=shpss_YOUR_SECRET_HERE
```

Get these from:
1. Shopify Partner Dashboard → Apps → Your App
2. Configuration tab → API credentials

### 2. "invalid_request" Error

**Error Log:**
```
[Token Exchange] ❌ Token exchange failed!
[Token Exchange] Status: 400
[Token Exchange] Error: invalid_request
[Token Exchange] Description: The authorization code is invalid or has expired
```

**Common Causes:**
- ❌ Authorization code was **already used** (can only use once)
- ❌ Authorization code **expired** (valid for ~10 minutes)
- ❌ Wrong code format
- ❌ Code has extra spaces or characters

**Fixes:**
- Try OAuth flow again from scratch
- Don't copy/paste the code - it should be passed automatically
- Check for URL encoding issues in the code

### 3. "invalid_client" Error

**Error Log:**
```
[Token Exchange] ❌ Token exchange failed!
[Token Exchange] Status: 401
[Token Exchange] Error: invalid_client
```

**Cause:** `SHOPIFY_API_KEY` or `SHOPIFY_API_SECRET` is incorrect

**Debug Steps:**
1. Verify in `.env`:
   ```bash
   echo $SHOPIFY_API_KEY
   echo $SHOPIFY_API_SECRET
   ```
2. Compare with Shopify Partner Dashboard
3. Check for accidental spaces or quotes
4. Restart dev server after changing `.env`

**Fix:**
```env
# Copy exact values from Shopify Partner Dashboard
SHOPIFY_API_KEY=your_exact_api_key
SHOPIFY_API_SECRET=your_exact_api_secret
```

### 4. "Shop domain missing" Error

**Error Log:**
```
[Token Exchange] ERROR: Shop domain missing!
```

**Cause:** The `shop` parameter wasn't passed to `exchangeCodeForToken()`

**Debug:**
Check console for:
```
[Callback] Extracted params: { code, shop: ..., state, hmac, timestamp }
```

Is `shop` populated? If not, check the callback URL:
```
http://localhost:3001/api/auth/callback?shop=my-store.myshopify.com&code=...&hmac=...
```

### 5. "Authorization code missing" Error

**Error Log:**
```
[Token Exchange] Code: MISSING!
```

**Cause:** The `code` parameter wasn't in the callback URL

**Debug:**
Check the callback URL:
```
http://localhost:3001/api/auth/callback?shop=...&code=SHOULD_BE_HERE&hmac=...
```

If `code` is missing, Shopify didn't send it. This could mean:
- Shopify OAuth flow didn't complete
- User cancelled authorization
- Shop domain is invalid

### 6. "Network error" Error

**Error Log:**
```
[Token Exchange] Network error: fetch failed
[Token Exchange] This usually means:
[Token Exchange]   - Network connectivity issue
[Token Exchange]   - DNS resolution failure for shop domain
[Token Exchange]   - Invalid shop domain
```

**Causes:**
- ❌ Invalid shop domain (e.g., `my store.myshopify.com` with space)
- ❌ No internet connection
- ❌ Firewall blocking Shopify API
- ❌ Shop domain typo in callback

**Fixes:**
- Verify shop domain: `my-store.myshopify.com` (hyphens, no spaces)
- Test network: `ping api.shopify.com`
- Check firewall settings

### 7. "No access token in response"

**Error Log:**
```
[Token Exchange] ERROR: No access_token in response!
[Token Exchange] Response: { scope: "...", expires_in: 86400 }
```

**Cause:** Shopify returned a response but without the required `access_token` field

**Debug:**
Look at the full response in the logs. Is something else returned instead?

---

## Manual Testing

### Test Token Exchange Directly

```bash
# Get an authorization code first (complete OAuth flow)
# Then test the token exchange with curl:

curl -X POST \
  https://my-store.myshopify.com/admin/oauth/access_token \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "your_api_key_here",
    "client_secret": "your_api_secret_here",
    "code": "the_authorization_code_from_callback"
  }'

# Expected response:
# {
#   "access_token": "shpat_...",
#   "expires_in": 86400,
#   "scope": "read_products,read_orders,read_customers"
# }
```

---

## The Full Token Exchange Request

**Method:** `POST`

**URL:** `https://{shop}/admin/oauth/access_token`

**Headers:**
```
Content-Type: application/json
User-Agent: ShopifyVoiceReceptionist/1.0
```

**Body (JSON):**
```json
{
  "client_id": "your_shopify_api_key",
  "client_secret": "your_shopify_api_secret",
  "code": "authorization_code_from_callback"
}
```

**Success Response (200):**
```json
{
  "access_token": "shpat_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "expires_in": 86400,
  "scope": "read_products,read_orders,read_customers"
}
```

**Error Response (400):**
```json
{
  "error": "invalid_request",
  "error_description": "The authorization code is invalid or has expired"
}
```

---

## Console Log Interpretation

### Successful Flow
```
✅ [Token Exchange] Starting token exchange...
✅ [Token Exchange] Shop domain: my-store.myshopify.com
✅ [Token Exchange] Response status: 200 OK
✅ [Token Exchange] ✅ Token exchange successful!
✅ [Token Exchange] Access token received: shpat_...
```

### Failed - Wrong Credentials
```
❌ [Token Exchange] API_KEY set: false
❌ [Token Exchange] API_SECRET set: false
❌ [Token Exchange] ERROR: Missing Shopify API credentials!
```

### Failed - Invalid Code
```
❌ [Token Exchange] Response status: 400 Bad Request
❌ [Token Exchange] Error: invalid_request
❌ [Token Exchange] Description: The authorization code is invalid or has expired
```

### Failed - Network Issue
```
❌ [Token Exchange] Network error: getaddrinfo ENOTFOUND my-store.myshopify.com
❌ [Token Exchange] This usually means:
❌ [Token Exchange]   - DNS resolution failure for shop domain
```

---

## Step-by-Step Debugging

### 1. Check Environment Variables
```bash
# In your terminal
echo $SHOPIFY_API_KEY
echo $SHOPIFY_API_SECRET

# Should output:
# a0563782e38f84b7ce2ef0d2f5b87ed5
# shpss_YOUR_SECRET_HERE
```

### 2. Check Dev Server Logs
```bash
# Terminal where you ran: npm run dev
# Watch for [Token Exchange] logs
# Look for [✅ Token exchange successful!] or [❌ Failed] messages
```

### 3. Test OAuth Flow
1. Start server: `npm run dev`
2. Visit: `http://localhost:3001/api/auth?shop=your-test-store.myshopify.com`
3. Complete Shopify OAuth
4. Check console logs

### 4. Verify Credentials
1. Go to: https://shopify.dev/docs/apps/getting-started/create
2. Find your app in Partner Dashboard
3. Copy API credentials
4. Paste into `.env`
5. Restart dev server
6. Try OAuth again

### 5. Check for Reused Authorization Code
```
❌ The code was already used
```

**Solution:** The authorization code can only be used ONCE. Start fresh OAuth flow.

---

## Code Changes Made

### Before (Minimal Logging)
```typescript
// ❌ BEFORE: Very little debugging info
if (!response.ok) {
  throw new Error(`Failed to exchange code: ${response.statusText}`);
}
return response.json();
```

### After (Comprehensive Logging)
```typescript
// ✅ AFTER: Detailed logging at every step
console.log('[Token Exchange] Starting token exchange...');
console.log('[Token Exchange] Shop domain:', shop);
console.log('[Token Exchange] Code:', code ? `${code.substring(0, 20)}...` : 'MISSING!');
console.log('[Token Exchange] API Key:', env.SHOPIFY_API_KEY ? `${env.SHOPIFY_API_KEY.substring(0, 10)}...` : 'MISSING!');
console.log('[Token Exchange] API Secret:', env.SHOPIFY_API_SECRET ? 'SET' : 'MISSING!');

// ... validation ...

const response = await fetch(tokenUrl, {...});

console.log('[Token Exchange] Response status:', response.status);
// ... parse and log response ...

if (!response.ok) {
  const shopifyError = responseData?.error || 'Unknown error';
  console.error('[Token Exchange] Error:', shopifyError);
  throw new Error(`...detailed error message...`);
}

console.log('[Token Exchange] ✅ Token exchange successful!');
```

---

## Quick Reference

| Problem | Look For | Fix |
|---------|----------|-----|
| "API credentials not configured" | `API_KEY set: false` | Add to `.env` |
| "invalid_client" | Status 401 | Check API credentials |
| "invalid_request" | Status 400 | Code expired, try OAuth again |
| "Network error" | DNS failure | Check shop domain spelling |
| No error in logs, just 502 | Check callback response | Restart dev server |

---

## Files Modified

- `src/lib/shopify/auth.ts` - Added comprehensive `exchangeCodeForToken()` logging
- `src/app/api/auth/callback/route.ts` - Enhanced error handling and messages

---

## References

- [Shopify OAuth Documentation](https://shopify.dev/docs/apps/auth-admin/oauth-admin-access-token)
- [Shopify API Errors](https://shopify.dev/docs/api/admin-rest/2024-01/resources/oauth)
- Token Exchange Endpoint: `POST https://{shop}/admin/oauth/access_token`
