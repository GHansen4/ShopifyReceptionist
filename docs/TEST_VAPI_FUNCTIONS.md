# Test Vapi Functions Endpoint

## Problem
Agent can't access product details during phone calls.

## Diagnostic Steps

### Step 1: Check Logs During Call

When you make a test call, watch your **Next.js terminal** (not Shopify CLI).

You should see logs like:
```
[Vapi Functions] ═══════════════════════════════════════
[Vapi Functions] Received function call
[Vapi Functions] Function: get_products
[Vapi Functions] Parameters: {...}
```

**If you don't see these logs:**
- Vapi isn't reaching your endpoint
- Check if the tunnel URL is correct
- Check if the tunnel is still active

### Step 2: Test Function Endpoint Manually

Test if the endpoint works:

```powershell
# Test with curl (replace YOUR_TUNNEL_URL and YOUR_VAPI_API_KEY)
curl -X POST https://YOUR_TUNNEL_URL/api/vapi/functions `
  -H "Content-Type: application/json" `
  -H "x-api-key: YOUR_VAPI_API_KEY" `
  -d '{
    "message": {
      "functionCall": {
        "name": "get_products",
        "parameters": {
          "limit": 3,
          "shop": "always-ai-dev-store.myshopify.com"
        }
      }
    }
  }'
```

**Expected response:**
```json
{
  "results": [{
    "products": [...],
    "count": 3
  }]
}
```

### Step 3: Check Common Issues

#### Issue 1: API Key Not Sent
The assistant needs to send your VAPI_API_KEY in the request.

**Check in provision code:** `serverUrlSecret: process.env.VAPI_API_KEY`

#### Issue 2: Shop Not Passed
The function needs to know which shop to query.

**Check assistant configuration:** Does it include shop parameter?

#### Issue 3: No Shopify Session
Your app needs an active Shopify session.

**Check database:**
```sql
SELECT * FROM shopify_sessions WHERE shop = 'always-ai-dev-store.myshopify.com';
```

Should have an `accessToken`.

#### Issue 4: Tunnel Changed
If you restarted cloudflared, the tunnel URL changed.

**Solution:** Update assistant serverUrl in Vapi dashboard with new tunnel URL.

### Step 4: Check What the Agent Sees

During a call, the agent should say something like:
- "Let me check what we have available..."
- Then list products

If the agent says:
- "I'm having trouble accessing that information"
- "I can't retrieve that right now"
- Just goes silent

→ The function call is failing

---

## Quick Test Without Calling

Test the endpoint directly from your browser:

1. Open: `https://YOUR_TUNNEL_URL/api/vapi/functions`
2. You should get a 405 (Method Not Allowed) because browser uses GET
3. This confirms the endpoint is reachable

OR use Postman/Thunder Client to send a POST request.

---

## Most Likely Issues (in order)

1. **Tunnel URL changed** (you restarted cloudflared)
   - Solution: Update serverUrl in Vapi dashboard
   
2. **API key not being sent**
   - Check: `serverUrlSecret` in assistant config
   - Check: Vapi logs in their dashboard
   
3. **Shop parameter missing**
   - The function needs to know which shop
   - Should be hardcoded or passed in parameters
   
4. **No Shopify session/token**
   - Run OAuth flow to get access token
   - Check database for session

---

## What to Check First

**Tell me:**
1. Do you see `[Vapi Functions]` logs in Next.js terminal during calls?
2. What does the agent say when you ask about products?
3. Are you using the same tunnel URL that you provisioned with?

