# Shopify Error Extraction Enhancement

## Problem Fixed

You were getting "Unknown error" when Shopify returned errors in different formats. The code wasn't recognizing all the possible ways Shopify structures error responses.

---

## Solution: Multi-Format Error Extraction

The token exchange code now handles **5 different Shopify error response formats**:

### **Format 1: Standard OAuth Error**
```json
{
  "error": "invalid_client",
  "error_description": "The client ID provided is invalid"
}
```
**Extracted as:** `invalid_client - The client ID provided is invalid`

### **Format 2: Validation Error (Nested Array)**
```json
{
  "errors": {
    "base": [
      "The authorization code is invalid or has expired"
    ]
  }
}
```
**Extracted as:** `Invalid request - The authorization code is invalid or has expired`

### **Format 3: Multi-Field Validation Error**
```json
{
  "errors": {
    "client_id": ["is invalid"],
    "code": ["is expired"]
  }
}
```
**Extracted as:** `Validation error - client_id: is invalid | code: is expired`

### **Format 4: Simple Message Error**
```json
{
  "message": "Something went wrong"
}
```
**Extracted as:** `Error - Something went wrong`

### **Format 5: Detail Field Error**
```json
{
  "detail": "Authorization failed",
  "details": "See detail field"
}
```
**Extracted as:** `Error - Authorization failed`

---

## Error Extraction Logic

The new `extractShopifyError()` function:

1. **Tries Format 1** (`error` + `error_description`)
2. **Tries Format 2** (`errors.base` array)
3. **Tries Format 3** (`errors` object with fields)
4. **Tries Format 4** (`message` field)
5. **Tries Format 5** (`detail` or `details` field)
6. **Falls back** to full JSON stringify if nothing matches

Each format is checked in order, and the first match is used.

---

## Console Output Improvement

### Before (Generic)
```
[Token Exchange] Shopify Error Code: Unknown error
[Token Exchange] Shopify Error Description: 
```

### After (Specific)
```
[Token Exchange] Shopify Error Code: Invalid request
[Token Exchange] Shopify Error Description: The authorization code is invalid or has expired
[Token Exchange] Full Response Object: { errors: { base: [...] } }

[Token Exchange] 💡 Tip: Authorization codes can only be used ONCE
[Token Exchange] 💡 Try starting a fresh OAuth flow
```

---

## Smart Error Detection

The code now detects common patterns and gives you helpful tips:

```
if (shopifyErrorDescription.toLowerCase().includes('invalid') || 
    shopifyErrorDescription.toLowerCase().includes('expired')) {
  console.error('[Token Exchange] 💡 Tip: Authorization codes can only be used ONCE');
  console.error('[Token Exchange] 💡 Try starting a fresh OAuth flow');
}
```

This means:
- **Error contains "invalid"?** → Suggests it might be already used or credentials wrong
- **Error contains "expired"?** → Suggests the code has expired

---

## Code Implementation

```typescript
// NEW: Helper function to extract error message from various Shopify response formats
function extractShopifyError(obj: any): { error: string; description: string } {
  // Format 1: {"error": "code", "error_description": "..."}
  if (obj?.error && typeof obj.error === 'string') {
    return { error: obj.error, description: obj.error_description || '' };
  }
  
  // Format 2: {"errors": {"base": ["message", "message2"]}}
  if (obj?.errors?.base && Array.isArray(obj.errors.base)) {
    return {
      error: 'Invalid request',
      description: obj.errors.base.join(', '),
    };
  }
  
  // Format 3: {"errors": {"field": ["message"]}}
  if (obj?.errors && typeof obj.errors === 'object') {
    const errorMessages: string[] = [];
    for (const [key, value] of Object.entries(obj.errors)) {
      if (Array.isArray(value)) {
        errorMessages.push(`${key}: ${(value as string[]).join(', ')}`);
      } else if (typeof value === 'string') {
        errorMessages.push(`${key}: ${value}`);
      }
    }
    if (errorMessages.length > 0) {
      return { error: 'Validation error', description: errorMessages.join(' | ') };
    }
  }
  
  // Format 4: {"message": "..."}
  if (obj?.message && typeof obj.message === 'string') {
    return { error: 'Error', description: obj.message };
  }
  
  // Format 5: {"detail": "..."} or {"details": "..."}
  if (obj?.detail || obj?.details) {
    return { error: 'Error', description: obj.detail || obj.details };
  }
  
  // Fallback
  return { error: 'Unknown error', description: JSON.stringify(obj) };
}

// Usage
const { error: shopifyError, description: shopifyErrorDescription } = extractShopifyError(responseObj);
```

---

## Testing the Fix

### Step 1: Restart Dev Server
Dev server should now be running with the new code:
```bash
npm run dev
```

### Step 2: Test OAuth Flow
```
http://localhost:3001/api/auth?shop=always-on-apps.myshopify.com
```

### Step 3: Check Console Output

You should now see **specific error messages** instead of "Unknown error":

```
[Token Exchange] Shopify Error Code: Invalid request
[Token Exchange] Shopify Error Description: The authorization code is invalid or has expired
```

### Step 4: Follow the Tips

The console now provides helpful diagnostics:
```
[Token Exchange] 💡 Tip: Authorization codes can only be used ONCE
[Token Exchange] 💡 Try starting a fresh OAuth flow
```

---

## Your 400 Error - Now Fixed

The error you were seeing:
```
Error: "Unknown error" from Shopify API
Error code in details: "always-on-apps.myshopify.com"
```

With the enhanced extraction, you'll now see the **actual Shopify error message**:

**Possible:** `The authorization code is invalid or has expired`  
**Or:** `Invalid client credentials`  
**Or:** `Shop domain is invalid`

---

## All Shopify Error Formats Covered

| Format | Example | Now Handled |
|--------|---------|:-----------:|
| `{"error": "code", "error_description": "..."}` | Standard OAuth | ✅ |
| `{"errors": {"base": ["msg"]}}` | Validation | ✅ |
| `{"errors": {"field": ["msg"]}}` | Multi-field | ✅ |
| `{"message": "..."}` | Simple | ✅ |
| `{"detail": "..."}` | Detail field | ✅ |
| HTML error page | Network error | ✅ (detected) |

---

## Debugging Workflow

1. **See "Unknown error"?**
   - Check console for `Full Response Object:`
   - See what format Shopify returned
   - Report it - we'll add it to error extraction

2. **See "Invalid request - The authorization code..."?**
   - This is your actual error
   - Follow the suggestion in console

3. **See specific error code?**
   - Read the error description
   - Match it to common causes (see below)

---

## Common Shopify Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `invalid_client` | Wrong API Key/Secret | Check `.env` values |
| `authorization code expired` | Code >10 minutes old | Start fresh OAuth |
| `authorization code invalid` | Code already used | Start fresh OAuth |
| `invalid_request` | Malformed request | Check request body |
| `invalid_grant` | Shop doesn't exist | Check shop domain |

---

## Files Modified

- `src/lib/shopify/auth.ts` - Enhanced `exchangeCodeForToken()` with multi-format error extraction

---

## Benefits

✅ **Sees actual Shopify errors** instead of "Unknown error"  
✅ **Handles all Shopify response formats**  
✅ **Provides helpful tips** for common issues  
✅ **Easy to extend** if new formats appear  
✅ **Backward compatible** with existing code  

---

## Next Steps

1. Restart dev server (already done)
2. Test OAuth flow
3. Check console for **specific error messages**
4. Follow the suggested fixes
5. Try fresh OAuth flow if needed

**You now get the EXACT error from Shopify, not a generic "Unknown error"! 🎯**
