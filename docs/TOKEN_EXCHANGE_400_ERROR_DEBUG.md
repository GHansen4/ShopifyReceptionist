# Token Exchange 400 Bad Request - Debugging Guide

## The Error

```
400 Bad Request from Shopify
Error: "Unknown error" or specific error code
```

This error typically means the request was malformed, or the authorization code is invalid/already used.

---

## Ultra-Detailed Console Logging (NEW)

The enhanced token exchange now logs:

✅ Full request URL  
✅ All request headers  
✅ **Complete request body as JSON string**  
✅ Raw response text BEFORE parsing  
✅ Parsed response JSON  
✅ Exact Shopify error code  
✅ Common causes for 400 errors  

---

## Console Output Format

### ✅ Successful Token Exchange (Console Output)
```
═══════════════════════════════════════════════════════
[Token Exchange] Starting token exchange...
[Token Exchange] Shop domain: always-on-apps.myshopify.com
[Token Exchange] Code length: 64 chars
[Token Exchange] Code preview: 40cbe03761959d2b9...a5f6g7h8
[Token Exchange] API Key preview: a0563782e3...
[Token Exchange] API Secret set: true

[Token Exchange] Request URL: https://always-on-apps.myshopify.com/admin/oauth/access_token
[Token Exchange] Request headers:
[Token Exchange]   Content-Type: application/json
[Token Exchange]   User-Agent: ShopifyVoiceReceptionist/1.0
[Token Exchange] Request body (full JSON string):
[Token Exchange] {"client_id":"a0563782e38f84b7ce2ef0d2f5b87ed5","client_secret":"shpss_YOUR_SECRET_HERE","code":"40cbe03761959d2b91b4b23d665799ef"}
[Token Exchange] Request body (masked for security):
[Token Exchange]   { client_id: "a0563782e3...", client_secret: "***MASKED***", code: "40cbe037619..." }

[Token Exchange] Sending POST request to Shopify...
───────────────────────────────────────────────────────
[Token Exchange] Response received from Shopify
[Token Exchange] HTTP Status: 200 OK
[Token Exchange] Response headers:
[Token Exchange]   content-type: application/json; charset=utf-8
[Token Exchange]   x-shopify-shop-api-call-limit: 2/40

[Token Exchange] Response body (raw text):
[Token Exchange] {"access_token":"shpat_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6","expires_in":86400,"scope":"read_products,read_orders,read_customers"}
[Token Exchange] Response body (parsed JSON):
[Token Exchange] {
  "access_token": "shpat_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "expires_in": 86400,
  "scope": "read_products,read_orders,read_customers"
}

───────────────────────────────────────────────────────
[Token Exchange] ✅ TOKEN EXCHANGE SUCCESSFUL!
[Token Exchange] Access token received: shpat_a1b2c3d4e5...
[Token Exchange] Expires in: 86400 seconds
[Token Exchange] Scope: read_products,read_orders,read_customers
═══════════════════════════════════════════════════════
```

### ❌ Failed - 400 Bad Request (Console Output)
```
═══════════════════════════════════════════════════════
[Token Exchange] Starting token exchange...
[Token Exchange] Shop domain: always-on-apps.myshopify.com
[Token Exchange] Code length: 64 chars
[Token Exchange] Code preview: 40cbe03761959d2b9...a5f6g7h8
[Token Exchange] API Key preview: a0563782e3...
[Token Exchange] API Secret set: true

[Token Exchange] Request URL: https://always-on-apps.myshopify.com/admin/oauth/access_token
[Token Exchange] Request headers:
[Token Exchange]   Content-Type: application/json
[Token Exchange]   User-Agent: ShopifyVoiceReceptionist/1.0
[Token Exchange] Request body (full JSON string):
[Token Exchange] {"client_id":"a0563782e38f84b7ce2ef0d2f5b87ed5","client_secret":"shpss_YOUR_SECRET_HERE","code":"40cbe03761959d2b91b4b23d665799ef"}

[Token Exchange] Sending POST request to Shopify...
───────────────────────────────────────────────────────
[Token Exchange] Response received from Shopify
[Token Exchange] HTTP Status: 400 Bad Request
[Token Exchange] Response headers:
[Token Exchange]   content-type: application/json; charset=utf-8

[Token Exchange] Response body (raw text):
[Token Exchange] {"errors":{"base":["The authorization code is invalid or has expired"]}}
[Token Exchange] Response body (parsed JSON):
[Token Exchange] {
  "errors": {
    "base": [
      "The authorization code is invalid or has expired"
    ]
  }
}

───────────────────────────────────────────────────────
[Token Exchange] ❌ TOKEN EXCHANGE FAILED!
[Token Exchange] HTTP Status: 400
[Token Exchange] Shopify Error Code: Unknown error
[Token Exchange] Shopify Error Description: 
[Token Exchange] Full Response Object: { errors: { base: [...] } }

[Token Exchange] 🔍 400 Bad Request - Possible causes:
[Token Exchange]   - Authorization code already used
[Token Exchange]   - Authorization code expired (valid ~10 minutes)
[Token Exchange]   - Malformed request body
[Token Exchange]   - Shop domain is incorrect
[Token Exchange]   - API Key or Secret is incorrect
═══════════════════════════════════════════════════════
```

---

## Common 400 Bad Request Issues

### 1. Authorization Code Already Used

**Symptom:**
```
Status: 400
Error: The authorization code is invalid or has expired
```

**Cause:** Authorization codes can only be used ONCE. If you've already exchanged it, you can't use it again.

**Fix:**
- Start a fresh OAuth flow
- Don't test multiple times with the same code
- Each test needs a new authorization code

### 2. Authorization Code Expired

**Symptom:**
```
Status: 400
Error: The authorization code is invalid or has expired
```

**Cause:** Authorization codes expire after ~10 minutes.

**Fix:**
- Complete the OAuth flow quickly
- Don't wait too long between OAuth initiation and callback
- Start a fresh OAuth flow

### 3. Wrong API Credentials

**Symptom:**
```
Status: 400
Error: Invalid request body
```

**Cause:** The `client_id` or `client_secret` don't match Shopify's records.

**Fix:**
1. Check console log: `Request body (full JSON string):`
2. Verify the `client_id` value
3. Go to Shopify Partner Dashboard
4. Compare with your app's API Key
5. If different, update `.env`

### 4. Wrong Shop Domain

**Symptom:**
```
Status: 400
Error: Invalid shop domain
```

**Cause:** Shop domain is formatted incorrectly or doesn't exist.

**Check:**
Look at `Request URL:` in console:
```
Request URL: https://always-on-apps.myshopify.com/admin/oauth/access_token
```

Should be: `https://{shop-name}.myshopify.com/admin/oauth/access_token`

**Fix:**
- Verify shop name: `my-store.myshopify.com` (lowercase, hyphens)
- Not: `my_store.myshopify.com` (underscores)
- Not: `My-Store.myshopify.com` (uppercase)

### 5. Malformed Request Body

**Symptom:**
```
Status: 400
Error: Invalid JSON
```

**Check:**
Look at `Request body (full JSON string):` in console:
```
[Token Exchange] {"client_id":"a0563782...","client_secret":"shpss_...","code":"40cbe..."}
```

Should have:
- ✅ `client_id` field (matches API Key)
- ✅ `client_secret` field (not your secret password!)
- ✅ `code` field (from callback)

**Fix:**
- Verify all three fields are present
- Verify Content-Type is `application/json`
- Verify JSON is valid (no extra commas, quotes)

---

## How to Use the New Logging

### Step 1: Start Dev Server
```bash
npm run dev
```

### Step 2: Test OAuth Flow
```
http://localhost:3001/api/auth?shop=always-on-apps.myshopify.com
```

### Step 3: Watch Console Output

**Look for the separator lines:**
```
═══════════════════════════════════════════════════════
[Token Exchange] Starting token exchange...
```

**Then scroll through the output:**
- ✅ Check Request section
  - Is the URL correct?
  - Are headers correct?
  - Is request body complete JSON?

- ✅ Check Response section
  - Is HTTP status 200 (success) or 400 (failure)?
  - What does the raw response say?
  - What's the parsed JSON response?

### Step 4: Interpret the Error

**Example: Authorization code already used**
```
[Token Exchange] Response body (parsed JSON):
[Token Exchange] {
  "errors": {
    "base": ["The authorization code is invalid or has expired"]
  }
}

[Token Exchange] 🔍 400 Bad Request - Possible causes:
[Token Exchange]   - Authorization code already used ← THIS ONE!
```

**Fix:** Start fresh OAuth flow

---

## Request Body Format Reference

### Correct JSON Format
```json
{
  "client_id": "a0563782e38f84b7ce2ef0d2f5b87ed5",
  "client_secret": "shpss_YOUR_SECRET_HERE",
  "code": "40cbe03761959d2b91b4b23d665799ef"
}
```

**All 3 fields must be:**
- ✅ Exact (no extra spaces)
- ✅ Quoted properly (double quotes)
- ✅ Comma-separated
- ✅ In curly braces

---

## Troubleshooting Checklist

### Before Testing
- [ ] `.env` has `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET`
- [ ] Values copied exactly from Partner Dashboard (no extra spaces)
- [ ] Dev server restarted after `.env` changes
- [ ] NODE_ENV is `development` for logging

### During Testing
- [ ] Visit: `http://localhost:3001/api/auth?shop=...`
- [ ] Complete OAuth in Shopify
- [ ] Watch console immediately after redirect
- [ ] Look for `═══` separator lines
- [ ] Read both Request and Response sections

### If Getting 400 Error
- [ ] Check error description in Response section
- [ ] Check the "Possible causes" list
- [ ] Look at Request body - is it complete?
- [ ] Try fresh OAuth flow (don't reuse code)
- [ ] Check API credentials match Partner Dashboard

### If Error Shows "Unknown error"
This usually means Shopify returned an error in an unexpected format.

**Debug:**
Look at: `[Token Exchange] Response body (raw text):`

This shows the exact text Shopify returned. Copy it and:
1. Check if it's HTML (error page) or JSON (API response)
2. If HTML, might be a network/proxy issue
3. If JSON, look for the actual error message

---

## Common Error Responses from Shopify

### Code Already Used
```json
{"errors": {"base": ["The authorization code is invalid or has expired"]}}
```

### Code Expired
```json
{"errors": {"base": ["The authorization code is invalid or has expired"]}}
```

### Wrong Credentials
```json
{"error": "invalid_client", "error_description": "The client ID provided is invalid"}
```

### Invalid Shop
```json
{"error": "invalid_request", "error_description": "Invalid shop domain"}
```

---

## Next Steps

1. ✅ Run dev server: `npm run dev`
2. ✅ Test OAuth flow and complete it
3. ✅ Check console for `[Token Exchange]` logs
4. ✅ Look for request/response details
5. ✅ Identify the specific error from logs
6. ✅ Apply the fix from this guide
7. ✅ Try again with fresh OAuth flow

**The detailed logging now gives you EXACTLY what Shopify received and returned! 🔍**
