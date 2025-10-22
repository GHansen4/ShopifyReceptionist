# Debug Vapi Function Calls

## Current Issue
Agent says "having technical difficulties accessing inventory" - function calls are failing.

## Diagnostic Checklist

### 1. Check Logs in Next.js Terminal

Look for these specific lines when you ask about products:

**If you see NOTHING:**
```
(no logs appear)
```
→ Vapi can't reach your endpoint
→ Tunnel issue or wrong URL

**If you see:**
```
[Vapi Functions] ❌ Unauthorized: Invalid or missing API key
```
→ API key not being sent correctly
→ Check Vapi dashboard for assistant serverUrlSecret

**If you see:**
```
[Vapi Functions] Received function call
[get_products] Fetching products
[get_products] Shopify API error: 401
```
→ No Shopify access token
→ Need to run OAuth flow

**If you see:**
```
[Vapi Functions] Received function call
[get_products] Store not authenticated
```
→ No Shopify session in database
→ Need to authenticate store

---

## Quick Fixes

### Fix 1: If No Logs Appear (Tunnel Issue)

**Problem:** Vapi can't reach your endpoint

**Check:**
1. Is `cloudflared tunnel` still running?
2. Did you restart it (URL changed)?

**Solution:**
```powershell
# Check current tunnel URL
# Look in cloudflared terminal for: https://[something].trycloudflare.com

# If it changed, update in Vapi dashboard:
# 1. Go to vapi.ai dashboard
# 2. Find your assistant
# 3. Update serverUrl to new tunnel URL
```

---

### Fix 2: If API Key Error

**Problem:** Vapi not sending API key

**Check in Vapi Dashboard:**
1. Go to your assistant settings
2. Look for "Server URL Secret" or "Function Calling"
3. Should have your VAPI_API_KEY

**Solution:**
If missing, manually update in Vapi dashboard:
- serverUrl: `https://[your-tunnel].trycloudflare.com/api/vapi/functions`
- serverUrlSecret: Your `VAPI_API_KEY` value

---

### Fix 3: If No Shopify Session

**Problem:** No access token to call Shopify API

**Check Database:**
```sql
SELECT shop, access_token FROM shopify_sessions 
WHERE shop = 'always-ai-dev-store.myshopify.com';
```

**If empty or null access_token:**
1. Go to your app in Shopify Admin
2. This should trigger OAuth
3. Or manually visit: `/api/auth?shop=always-ai-dev-store.myshopify.com`

---

## Test Function Endpoint Manually

Test if your endpoint works at all:

```powershell
# Replace YOUR_TUNNEL_URL and YOUR_API_KEY
curl -X POST https://YOUR_TUNNEL_URL/api/vapi/functions `
  -H "Content-Type: application/json" `
  -H "x-api-key: YOUR_API_KEY" `
  -d '{
    "message": {
      "functionCall": {
        "name": "get_products",
        "parameters": {
          "limit": 3
        }
      }
    }
  }'
```

**Expected Success:**
```json
{
  "results": [{
    "products": [...],
    "count": 3
  }]
}
```

**If 401 Unauthorized:**
→ API key wrong

**If "Store not authenticated":**
→ No Shopify session

**If timeout:**
→ Tunnel not working

---

## What to Tell Me

Run a test call and immediately check your Next.js terminal. Then tell me:

1. **What logs appear?** (copy/paste the exact error)
2. **Current tunnel URL?** (from cloudflared terminal)
3. **Did you restart cloudflared?** (yes/no)

With that info, I can tell you exactly what's wrong.

