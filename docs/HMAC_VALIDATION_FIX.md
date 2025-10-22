# Shopify HMAC Validation Fix

## Problem
The OAuth callback was failing with "HMAC validation failed" error (401 status). This is a security mechanism where Shopify signs the callback parameters with a HMAC-SHA256 signature to ensure the callback came from Shopify and wasn't tampered with.

## Root Causes Identified

### 1. **Wrong HMAC Digest Format (PRIMARY ISSUE)**
**Before:** `.digest('base64')`
**After:** `.digest('hex')`

Shopify sends the HMAC as a **hexadecimal string**, not base64. The old code was computing the HMAC in base64 format, which would never match Shopify's hex format.

### 2. **Incomplete Parameter Set**
**Before:** Only validating `code`, `shop`, and `state` parameters
**After:** Validating ALL query parameters including `timestamp` and `host`

Shopify sends additional parameters in the callback that must be included in the HMAC validation:
- `code` - Authorization code
- `host` - Base64-encoded shop hostname  
- `hmac` - The signature to verify (EXCLUDED from validation)
- `shop` - Shop domain
- `state` - CSRF token (matches our nonce)
- `timestamp` - When Shopify generated this callback

### 3. **String Comparison Method**
**Before:** Simple equality check `===`
**After:** Timing-safe comparison using XOR

The timing-safe comparison prevents timing attacks where an attacker could deduce the HMAC by measuring how long the comparison takes.

### 4. **Query String Parsing**
**Before:** Manually constructed params object (incomplete)
**After:** Parse complete query string with URLSearchParams

Using URLSearchParams ensures all query parameters are captured, not just a manually-selected few.

## Changes Made

### File: `src/lib/shopify/auth.ts`

#### Change 1: Fixed HMAC Digest Format
```typescript
// BEFORE
.digest('base64')

// AFTER  
.digest('hex') // Use HEX, not base64!
```

#### Change 2: Added Timing-Safe Comparison
```typescript
// BEFORE
return computed === hmac;

// AFTER
return timingSafeEqual(computed, hmac);
```

New function added:
```typescript
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
```

#### Change 3: Added Comprehensive HMAC Validation Function
New function `validateCallbackHMAC(queryString: string)` that:
- Takes the complete query string
- Extracts HMAC from parameters
- Builds validation parameter list excluding 'hmac' and 'signature'
- Sorts parameters alphabetically
- Constructs message as `key1=value1&key2=value2&...`
- Computes HMAC-SHA256 in HEX format
- Uses timing-safe comparison

#### Change 4: Added Debug Logging
Comprehensive logging that shows:
- Full query string received
- Extracted parameters
- Message being signed
- Computed HMAC
- Match result
- Each validation step

Only logs in `NODE_ENV === 'development'` for security.

### File: `src/app/api/auth/callback/route.ts`

#### Change 1: Use New Validation Function
```typescript
// BEFORE
const params = { code, shop, state };
if (!validateHMAC(params, hmac)) {

// AFTER
const queryString = request.nextUrl.search.substring(1);
if (!validateCallbackHMAC(queryString)) {
```

#### Change 2: Added Comprehensive Logging
Added logging at each step:
- Full URL and query string
- Extracted parameters (including timestamp)
- Nonce/state validation
- HMAC validation process
- Token exchange
- Database operations
- Final success/failure

## Shopify's HMAC Validation Requirements

According to [Shopify's documentation](https://shopify.dev/docs/apps/auth-admin/oauth-admin-access-token):

1. **Extract the HMAC** from query parameters
2. **Get all other query params** (exclude 'hmac' and 'signature')
3. **Sort params alphabetically** by key name
4. **Build a message string**: `key1=value1&key2=value2&key3=value3`
5. **Compute HMAC-SHA256** using your API Secret as the key
6. **Compare as HEX strings** (case-sensitive)
7. **Use timing-safe comparison** to prevent timing attacks

## Testing the Fix

### 1. Start dev server
```bash
npm run dev
```

### 2. Trigger OAuth flow
Visit: `http://localhost:3000/api/auth?shop=always-on-apps.myshopify.com`

### 3. Check console logs
Look for `[HMAC Validation]` and `[Callback]` prefixed logs showing:
```
[HMAC Validation] Full query string: code=...&hmac=...&host=...&shop=...&state=...&timestamp=...
[HMAC Validation] Validation params: [['code', '...'], ['host', '...'], ['shop', '...'], ['state', '...'], ['timestamp', '...']]
[HMAC Validation] Message to sign: code=...&host=...&shop=...&state=...&timestamp=...
[HMAC Validation] Computed HMAC: f5eec8750d6740a56499ac26c4128fbd3613abb0342e1f2854ff23c7f3aad004
[HMAC Validation] Match result: true
```

### 4. Verify timestamp validation
The timestamp from Shopify should be recent (within last few seconds).
Current implementation accepts timestamps from the past without strict validation.

## Security Considerations

✅ **Proper Implementation:**
- Uses SHOPIFY_API_SECRET (never exposed in code)
- Timing-safe comparison (prevents timing attacks)
- Validates all query parameters
- Checks state/nonce for CSRF protection
- Rejects tampered or replayed callbacks

⚠️ **Future Enhancements:**
- Add timestamp validation (currently accepts any timestamp)
- Add rate limiting on callback processing
- Log all HMAC failures for monitoring

## Environment Variables Required

```env
SHOPIFY_API_SECRET=your_api_secret_here
```

This is used as the key for HMAC computation. **Never expose this value.**

## References

- [Shopify OAuth Documentation](https://shopify.dev/docs/apps/auth-admin/oauth-admin-access-token)
- [HMAC-SHA256](https://en.wikipedia.org/wiki/HMAC)
- [Timing Attacks](https://en.wikipedia.org/wiki/Timing_attack)
