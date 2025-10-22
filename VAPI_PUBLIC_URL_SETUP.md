# Vapi Public URL Setup Guide

## ✅ Current Configuration

Your Vapi integration is **already configured** to use Shopify CLI's public tunnel URL!

### How It Works

1. **Shopify CLI Creates a Tunnel**
   ```
   When you run: shopify app dev
   Shopify CLI creates: https://[random].trycloudflare.com
   Saved to: process.env.SHOPIFY_APP_URL
   ```

2. **Vapi Assistant Uses the Tunnel**
   - Location: `src/app/api/vapi/test/provision/route.ts` (line 116)
   - Configuration:
     ```typescript
     serverUrl: `${process.env.SHOPIFY_APP_URL}/api/vapi/functions`
     serverUrlSecret: process.env.VAPI_API_KEY
     ```
   - This tells Vapi to call: `https://[tunnel].trycloudflare.com/api/vapi/functions`

3. **Function Endpoint Validates API Key**
   - Location: `src/app/api/vapi/functions/route.ts`
   - Security:
     ```typescript
     const apiKey = request.headers.get('x-api-key')
     if (apiKey !== process.env.VAPI_API_KEY) {
       return 401 Unauthorized
     }
     ```

4. **Middleware Allows Public Access**
   - Location: `src/middleware.ts` (line 11)
   - `/api/vapi/functions` is in the public routes list
   - Vapi can call it **without** Shopify session tokens

---

## 📋 Verification Checklist

### Step 1: Check Environment Variables

```bash
# In PowerShell, check your .env file
Select-String -Pattern "VAPI_API_KEY" .env
Select-String -Pattern "VAPI_TEST_PHONE_NUMBER" .env
```

Expected output:
```
VAPI_API_KEY=92c92ccc-8c0b-416b-b059-47711e746ab8
VAPI_TEST_PHONE_NUMBER=+18312002458
```

### Step 2: Start BOTH Servers

**Terminal 1 - Shopify CLI (creates the tunnel):**
```powershell
shopify app dev
```

Wait for:
```
✅ Ready, watching for changes in your app
```

**Terminal 2 - Next.js Dev Server:**
```powershell
npm run dev
```

Wait for logs showing:
```
[Shopify Client] Host: https://[something].trycloudflare.com
```

### Step 3: Provision the Assistant

1. Open your app in the browser
2. Go to `/test/vapi` page
3. Click **"Provision Test Phone Number"**

### Step 4: Check the Logs

You should see:
```
[provision-xxx] ✅ Assistant created: ast_xxxxx
[provision-xxx] Function calling URL: https://[tunnel].trycloudflare.com/api/vapi/functions
[provision-xxx] ✅ Phone number linked: +1 (831) 200-2458
```

**✅ SUCCESS** = The tunnel URL is shown (not localhost)

**❌ PROBLEM** = Shows `https://localhost:3000/api/vapi/functions`
  - **Solution**: Make sure Shopify CLI is running FIRST

---

## 🧪 Test the Function Endpoint

### Test 1: Health Check

```powershell
# Replace [tunnel] with your actual tunnel URL from the logs
curl https://[tunnel].trycloudflare.com/api/vapi/functions
```

Expected response:
```json
{
  "status": "ok",
  "functions": ["get_products", "search_products"],
  "timestamp": "2025-10-21T..."
}
```

### Test 2: Call with API Key

```powershell
$headers = @{
    "x-api-key" = "92c92ccc-8c0b-416b-b059-47711e746ab8"
    "Content-Type" = "application/json"
}

$body = @{
    message = @{
        functionCall = @{
            name = "get_products"
            parameters = @{
                limit = 3
            }
        }
    }
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri "https://[tunnel].trycloudflare.com/api/vapi/functions" -Method POST -Headers $headers -Body $body
```

Expected response:
```json
{
  "results": [{
    "products": [...],
    "count": 3
  }]
}
```

### Test 3: Call WITHOUT API Key (should fail)

```powershell
Invoke-WebRequest -Uri "https://[tunnel].trycloudflare.com/api/vapi/functions" -Method POST
```

Expected:
```
401 Unauthorized
{ "results": [{ "error": "Unauthorized: Invalid API key" }] }
```

---

## 📞 Test a Real Phone Call

1. **Call the number:** `+1 (831) 200-2458`

2. **Ask about products:**
   - "What products do you sell?"
   - "Do you have t-shirts?"
   - "Tell me about your store"

3. **Check your terminal logs:**
   ```
   [Vapi Functions] ═══════════════════════════════════════
   [Vapi Functions] ✅ API key validated
   [Vapi Functions] Function: get_products
   [get_products] Fetching 5 products for always-ai-dev-store.myshopify.com
   [get_products] ✅ Fetched 3 products
   ```

4. **The AI should respond with:**
   - Real product names
   - Prices
   - Availability
   - Descriptions

---

## 🔧 Troubleshooting

### Problem: "serverUrl must be a valid URL" Error

**Cause**: Shopify CLI tunnel URL not available

**Fix**:
1. Start Shopify CLI FIRST: `shopify app dev`
2. Wait for "Ready" message
3. THEN start Next.js: `npm run dev`
4. Check logs for tunnel URL

### Problem: AI doesn't answer product questions

**Check 1**: Verify function URL in logs
```
[provision-xxx] Function calling URL: https://[tunnel].trycloudflare.com/api/vapi/functions
```

**Check 2**: Test the endpoint manually (see Test 2 above)

**Check 3**: Check function logs during a call
- The terminal should show `[Vapi Functions]` logs when AI calls the function

### Problem: 401 Unauthorized during call

**Cause**: API key mismatch

**Fix**:
1. Check Vapi dashboard → Assistant settings → Server URL Secret
2. Should match your `VAPI_API_KEY` in `.env`
3. Re-provision the assistant to update the key

### Problem: Tunnel URL changes

**Cause**: Tunnel URL is randomly generated each time you run `shopify app dev`

**Fix**:
1. Stop both servers
2. Restart Shopify CLI first
3. Wait for new tunnel URL
4. Start Next.js dev server
5. Re-provision the assistant (creates new assistant with new URL)
6. Old assistant will have the old URL (still works until you restart CLI)

---

## 🔐 Security Details

### How the API Key Works

1. **Vapi sends the key in the request header:**
   ```http
   POST https://[tunnel].trycloudflare.com/api/vapi/functions
   x-api-key: 92c92ccc-8c0b-416b-b059-47711e746ab8
   ```

2. **Your endpoint validates it:**
   ```typescript
   const apiKey = request.headers.get('x-api-key')
   if (apiKey !== process.env.VAPI_API_KEY) {
     return 401 Unauthorized
   }
   ```

3. **This prevents:**
   - Random people calling your endpoint
   - Unauthorized access to your Shopify data
   - Abuse of your API

### Available Functions

**`get_products`**
- Parameters: `limit` (number, optional)
- Returns: List of products with title, price, description, availability
- Use case: "What do you sell?", "Tell me about your products"

**`search_products`**
- Parameters: `query` (string, required)
- Returns: Products matching the search term
- Use case: "Do you have t-shirts?", "I'm looking for shoes"

---

## 📝 Environment Variables Summary

```env
# Vapi Configuration
VAPI_API_KEY=92c92ccc-8c0b-416b-b059-47711e746ab8  # Your Vapi API key (for authentication)
VAPI_PUBLIC_KEY=296470fc-f13b-4fa5-8f13-d486182c1880  # Vapi public key (unused currently)
VAPI_TEST_PHONE_NUMBER=+18312002458  # Phone number bought from Vapi dashboard

# Shopify Configuration (set automatically by Shopify CLI)
SHOPIFY_APP_URL=https://[random].trycloudflare.com  # ⚠️ Set by CLI, changes each restart

# Local Development (set manually in .env)
NEXT_PUBLIC_APP_URL=https://localhost:3000  # Fallback when CLI not running
```

---

## ✅ Success Criteria

Your setup is working correctly when:

1. ✅ Shopify CLI shows tunnel URL in logs
2. ✅ Next.js logs show: `[Shopify Client] Host: https://[tunnel].trycloudflare.com`
3. ✅ Provision logs show: `Function calling URL: https://[tunnel].trycloudflare.com/api/vapi/functions`
4. ✅ Calling the phone number connects successfully
5. ✅ AI responds with real product information when asked
6. ✅ Terminal shows `[Vapi Functions]` logs during calls

---

## 🚀 Next Steps

Once everything is working:

1. **Create more functions** (e.g., `check_inventory`, `get_order_status`)
2. **Enhance the system prompt** to make the AI more helpful
3. **Add more products** to your test store
4. **Test different conversation flows**
5. **Monitor the logs** during calls to debug issues

---

## 📚 Related Files

- **Function Endpoint**: `src/app/api/vapi/functions/route.ts`
- **Provisioning**: `src/app/api/vapi/test/provision/route.ts`
- **Middleware**: `src/middleware.ts` (line 11 - public routes)
- **Environment**: `.env` (VAPI_API_KEY, VAPI_TEST_PHONE_NUMBER)

