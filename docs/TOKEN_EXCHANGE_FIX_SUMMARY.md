# Token Exchange Debugging Fix Summary

## Problem

```
Failed to exchange authorization code (502)
```

Error occurs after HMAC validation passes but before the shop is saved to the database.

---

## Root Cause Analysis

The original token exchange function had:
- ❌ Minimal error logging
- ❌ No input validation
- ❌ No request/response logging
- ❌ Generic error messages
- ❌ No troubleshooting hints

This made it impossible to debug why the token exchange was failing.

---

## Solution: Comprehensive Debugging

### What Was Fixed

#### 1. **Input Validation** ✅
```typescript
// NOW validates:
✅ Shop domain is provided and not empty
✅ Authorization code is provided and not empty
✅ Shopify API credentials (KEY and SECRET) are configured
```

#### 2. **Request Logging** ✅
```typescript
// LOGS:
✅ Shop domain being used
✅ Authorization code (first 20 chars only, not exposed)
✅ API credentials status (not exposed, just "SET" or "MISSING")
✅ Full request URL
✅ Request payload (with masked secrets)
```

#### 3. **Response Logging** ✅
```typescript
// LOGS:
✅ HTTP status code and status text
✅ Response headers
✅ Full response body (parsed JSON or raw text)
✅ Any Shopify error codes and descriptions
```

#### 4. **Error Handling** ✅
```typescript
// NOW detects and reports:
✅ Missing API credentials → specific error message
✅ Invalid credentials (401) → suggests checking .env
✅ Invalid/expired code (400) → suggests starting OAuth again
✅ Network errors → suggests DNS or firewall issues
✅ Malformed responses → logs the actual response
```

#### 5. **Better Error Messages** ✅
```typescript
// BEFORE:
"Failed to exchange authorization code"

// AFTER:
"Failed to exchange authorization code: 401 Unauthorized. Shopify error: invalid_client. Check SHOPIFY_API_KEY and SHOPIFY_API_SECRET"
```

---

## Console Output Examples

### ✅ Successful Token Exchange
```
[Token Exchange] Starting token exchange...
[Token Exchange] Shop domain: my-store.myshopify.com
[Token Exchange] Code: 40cbe03761959d2b9...
[Token Exchange] API Key: a0563782e38f8...
[Token Exchange] API Secret: SET
[Token Exchange] Request URL: https://my-store.myshopify.com/admin/oauth/access_token
[Token Exchange] Request body: { client_id: "a0563...", client_secret: "***", code: "40cb..." }
[Token Exchange] Sending POST request to Shopify...
[Token Exchange] Response status: 200 OK
[Token Exchange] Response body (parsed): { access_token: "shpat_...", expires_in: 86400, scope: "..." }
[Token Exchange] ✅ Token exchange successful!
[Token Exchange] Access token received: shpat_a1b2c3d4e5...
[Token Exchange] Expires in: 86400 seconds
[Token Exchange] Scope: read_products,read_orders,read_customers
```

### ❌ Failed - Missing Credentials
```
[Token Exchange] ERROR: Missing Shopify API credentials!
[Token Exchange] API_KEY set: false
[Token Exchange] API_SECRET set: false
```

### ❌ Failed - Invalid Credentials
```
[Token Exchange] ❌ Token exchange failed!
[Token Exchange] Status: 401
[Token Exchange] Error: invalid_client
[Token Exchange] Description: The client ID provided is invalid.
[Token Exchange] Full response: { error: "invalid_client", ... }
```

### ❌ Failed - Expired Code
```
[Token Exchange] ❌ Token exchange failed!
[Token Exchange] Status: 400
[Token Exchange] Error: invalid_request
[Token Exchange] Description: The authorization code is invalid or has expired
```

### ❌ Failed - Network Error
```
[Token Exchange] Network error: getaddrinfo ENOTFOUND my-store.myshopify.com
[Token Exchange] This usually means:
[Token Exchange]   - Network connectivity issue
[Token Exchange]   - DNS resolution failure for shop domain
```

---

## Files Modified

### 1. `src/lib/shopify/auth.ts`

**Function:** `exchangeCodeForToken(shop, code)`

**Added:**
- ✅ Comprehensive input validation
- ✅ Step-by-step console logging
- ✅ Request details logging (URL, body, headers)
- ✅ Response details logging (status, headers, body)
- ✅ Shopify error extraction and reporting
- ✅ Network error handling
- ✅ Malformed response handling

**Key Improvements:**
```typescript
// Input Validation
if (!shop) throw new Error('Shop domain required');
if (!code) throw new Error('Authorization code required');
if (!env.SHOPIFY_API_KEY || !env.SHOPIFY_API_SECRET) throw new Error('API credentials not configured');

// Request Logging
console.log('[Token Exchange] Request URL:', tokenUrl);
console.log('[Token Exchange] Request body:', requestBody);

// Response Logging
console.log('[Token Exchange] Response status:', response.status);
const responseData = JSON.parse(await response.text());
console.log('[Token Exchange] Response body:', responseData);

// Error Extraction
const shopifyError = responseData?.error || 'Unknown error';
const shopifyErrorDescription = responseData?.error_description || '';
throw new Error(`Shopify error: ${shopifyError}. ${shopifyErrorDescription}`);
```

### 2. `src/app/api/auth/callback/route.ts`

**Enhanced Error Handling:**
```typescript
// BEFORE:
catch (error) {
  console.error('[Callback] Token exchange failed:', error);
  return createErrorResponse(
    new ExternalServiceError('Failed to exchange authorization code', 'shopify-oauth')
  );
}

// AFTER:
catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('[Callback] Error message:', errorMessage);
  
  let userMessage = 'Failed to exchange authorization code';
  
  if (errorMessage.includes('API credentials')) {
    userMessage = 'Shopify API credentials not configured. Check SHOPIFY_API_KEY and SHOPIFY_API_SECRET in .env';
  } else if (errorMessage.includes('invalid_client')) {
    userMessage = 'Invalid Shopify API credentials. Verify SHOPIFY_API_KEY and SHOPIFY_API_SECRET are correct.';
  } else if (errorMessage.includes('invalid_request')) {
    userMessage = 'Invalid request to Shopify. The authorization code may be expired or already used.';
  } else if (errorMessage.includes('Network error')) {
    userMessage = 'Network error connecting to Shopify. Check your internet connection.';
  }
  
  return createErrorResponse(
    new ExternalServiceError(userMessage, 'shopify-oauth', { 
      originalError: errorMessage,
      code: shop,
    })
  );
}
```

### 3. `docs/TOKEN_EXCHANGE_DEBUGGING.md` (New)

Comprehensive troubleshooting guide with:
- ✅ 7 common issues with specific console log patterns
- ✅ Manual testing instructions
- ✅ Full request/response specification
- ✅ Step-by-step debugging guide
- ✅ Quick reference table

---

## How to Debug Token Exchange Issues

### Step 1: Enable Development Logging
```bash
# Make sure NODE_ENV is set to development
NODE_ENV=development npm run dev
```

### Step 2: Test OAuth Flow
```
http://localhost:3001/api/auth?shop=your-test-store.myshopify.com
```

### Step 3: Watch Console for Logs
Look for one of these patterns:

**Success:**
```
[Token Exchange] ✅ Token exchange successful!
[Token Exchange] Access token received: shpat_...
```

**Failure - Missing Credentials:**
```
[Token Exchange] API_KEY set: false
[Token Exchange] ERROR: Missing Shopify API credentials!
→ Add SHOPIFY_API_KEY and SHOPIFY_API_SECRET to .env
```

**Failure - Invalid Credentials:**
```
[Token Exchange] Status: 401
[Token Exchange] Error: invalid_client
→ Verify API credentials in Shopify Partner Dashboard
```

**Failure - Expired Code:**
```
[Token Exchange] Status: 400
[Token Exchange] Error: invalid_request
→ Start fresh OAuth flow
```

### Step 4: Check Details in Logs
```
[Token Exchange] Response status: [status code]
[Token Exchange] Error: [specific error from Shopify]
[Token Exchange] Full response: [complete response body]
```

---

## Common Issues Quick Fix

| Error | Console Shows | Fix |
|-------|---------------|-----|
| API credentials not configured | `API_KEY set: false` | Add to `.env` file |
| Wrong API credentials | `Error: invalid_client` | Copy exact values from Partner Dashboard |
| Code already used | `Error: invalid_request` | Start fresh OAuth flow |
| Network issue | `Network error: getaddrinfo ENOTFOUND` | Check shop domain spelling |
| Firewall blocked | `Network error: fetch failed` | Check firewall/proxy settings |

---

## Testing Checklist

- [ ] Dev server running: `npm run dev`
- [ ] `.env` has SHOPIFY_API_KEY and SHOPIFY_API_SECRET
- [ ] OAuth flow: `http://localhost:3001/api/auth?shop=...`
- [ ] Console shows: `[Token Exchange] Starting token exchange...`
- [ ] Console shows: `[Token Exchange] ✅ Token exchange successful!`
- [ ] Check for [Token Exchange] logs, not just [Callback]
- [ ] Verify access token is received and logged

---

## Before & After Comparison

### Before (Hard to Debug)
```typescript
const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id: env.SHOPIFY_API_KEY,
    client_secret: env.SHOPIFY_API_SECRET,
    code,
  }),
});

if (!response.ok) {
  throw new Error(`Failed to exchange code: ${response.statusText}`);
}

return response.json();
```

**Issues:**
- ❌ No input validation
- ❌ No logging of parameters
- ❌ No logging of request details
- ❌ No logging of response
- ❌ Generic error message
- ❌ Can't see what went wrong

### After (Easy to Debug)
```typescript
// Input validation
if (!shop) throw new Error('Shop domain required');
if (!code) throw new Error('Authorization code required');
if (!env.SHOPIFY_API_KEY || !env.SHOPIFY_API_SECRET) 
  throw new Error('API credentials not configured');

// Logging
console.log('[Token Exchange] Shop domain:', shop);
console.log('[Token Exchange] Code:', code?.substring(0, 20) + '...');
console.log('[Token Exchange] Request URL:', tokenUrl);

// Request
const response = await fetch(tokenUrl, {...});

// Logging response
console.log('[Token Exchange] Response status:', response.status);
const responseData = JSON.parse(await response.text());
console.log('[Token Exchange] Response body:', responseData);

// Error handling
if (!response.ok) {
  const shopifyError = responseData?.error;
  console.error('[Token Exchange] Error:', shopifyError);
  throw new Error(`Shopify error: ${shopifyError}`);
}

// Success logging
console.log('[Token Exchange] ✅ Token exchange successful!');
```

**Improvements:**
- ✅ Validates all inputs
- ✅ Logs parameters
- ✅ Logs request details
- ✅ Logs response
- ✅ Extracts Shopify errors
- ✅ Clear error messages
- ✅ Easy to troubleshoot

---

## Resources

- **Full Debugging Guide:** `docs/TOKEN_EXCHANGE_DEBUGGING.md`
- **Shopify OAuth Docs:** https://shopify.dev/docs/apps/auth-admin/oauth-admin-access-token
- **Shopify API Errors:** https://shopify.dev/docs/api/admin-rest/2024-01/resources/oauth
- **Token Exchange Code:** `src/lib/shopify/auth.ts` lines 158-290
- **Callback Handler:** `src/app/api/auth/callback/route.ts` lines 69-87

---

## Next Steps

1. ✅ Restart dev server
2. ✅ Test OAuth flow
3. ✅ Watch for `[Token Exchange]` logs
4. ✅ If error, read the console message
5. ✅ Follow suggested fix
6. ✅ Try again

**You now have full visibility into token exchange! 🔍**
