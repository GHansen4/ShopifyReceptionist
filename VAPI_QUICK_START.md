# 🚀 Vapi Voice Receptionist - Quick Start

## ⚡ TL;DR - Make It Work Now!

```powershell
# ⚠️  IMPORTANT: Start Shopify CLI FIRST (creates public tunnel)
# Terminal 1:
shopify app dev

# Wait for: "✅ Ready, watching for changes in your app"

# Terminal 2: Then start Next.js
npm run dev

# 3. Open your app and go to /test/vapi
# 4. Click "Provision Test Phone Number"
# 5. Call +1 (831) 200-2458
# 6. Ask: "What products do you sell?"
```

## ⚠️ **Critical: Why You Need BOTH Servers**

**Shopify CLI (`shopify app dev`):**
- Creates a public tunnel URL (e.g., `https://[random].trycloudflare.com`)
- This tunnel is **required** for Vapi to call your app during phone calls
- **Without it, provisioning will fail with an error**

**Next.js (`npm run dev`):**
- Your actual app server running on `localhost:3000`
- Handles requests from the Shopify CLI tunnel

---

## 📋 Step-by-Step Instructions

### Step 1: Start Shopify CLI FIRST ⚠️

**Why?** Shopify CLI creates a public tunnel URL that Vapi needs.

```powershell
shopify app dev
```

**Wait for:**
```
✅ Ready, watching for changes in your app
Using URL: https://localhost:3000
```

**Important:** Don't close this terminal!

---

### Step 2: Start Next.js Dev Server

**Open a NEW PowerShell terminal** (keep Shopify CLI running)

```powershell
npm run dev
```

**Look for this line in the logs:**
```
[Shopify Client] Host: https://[something].trycloudflare.com
```

✅ **SUCCESS** = You see a `.trycloudflare.com` URL  
❌ **PROBLEM** = You see `localhost` (Shopify CLI not running?)

---

### Step 3: Provision Your Voice Assistant

1. **Open your browser** → `https://localhost:3000`
2. **Navigate to** → `/test/vapi`
3. **Click** → "Provision Test Phone Number"

**Watch the terminal logs:**
```
[provision-xxx] ✅ Assistant created: ast_xxxxx
[provision-xxx] ═══════════════════════════════════════
[provision-xxx] 📡 Function Calling URL: https://[tunnel].trycloudflare.com/api/vapi/functions
[provision-xxx] 🔑 API Key: 92c92ccc...
[provision-xxx] ✅ Public URL detected - Vapi can reach this!
[provision-xxx] ═══════════════════════════════════════
[provision-xxx] ✅ Phone number linked: +1 (831) 200-2458
```

✅ **SUCCESS** = Shows `.trycloudflare.com` URL  
❌ **PROBLEM** = Shows `localhost` or "WARNING: Using localhost URL"

**If you see the warning:**
1. Stop Next.js server (Ctrl+C)
2. Make sure Shopify CLI is running and shows "Ready"
3. Restart Next.js: `npm run dev`
4. Try provisioning again

---

### Step 4: Test the Voice Receptionist

**Call:** `+1 (831) 200-2458`

**Try these questions:**
- "What products do you sell?"
- "Do you have any t-shirts?"
- "Tell me about your store"
- "What's available?"

**What should happen:**

1. **Phone rings** ✅
2. **AI answers:** "Hello! You've reached always-ai-dev-store. I'm the AI assistant. How may I help you today?"
3. **You ask:** "What products do you sell?"
4. **AI responds with real product information** 🎉

---

### Step 5: Check the Logs

**While on the call, watch your terminal:**

```
[Vapi Functions] ═══════════════════════════════════════
[Vapi Functions] ✅ API key validated
[Vapi Functions] Function: get_products
[get_products] Fetching 5 products for always-ai-dev-store.myshopify.com
[get_products] ✅ Fetched 3 products
[Vapi Functions] Result: { products: [...], count: 3 }
```

✅ **SUCCESS** = You see these logs during the call  
❌ **PROBLEM** = No logs appear (AI can't reach your endpoint)

---

## 🔧 Common Problems & Fixes

### Problem 1: "serverUrl must be a valid URL. Hot tip, the protocol should be https://"

**Symptom:** Error when clicking "Provision Test Phone Number"

**Cause:** Shopify CLI tunnel URL not available

**Fix:**
```powershell
# Terminal 1: Start Shopify CLI FIRST
shopify app dev

# Wait for "Ready, watching for changes"

# Terminal 2: Then start Next.js
npm run dev

# Try provisioning again
```

---

### Problem 2: AI doesn't answer product questions

**Symptom:** AI says "I don't have access to that information" or gives generic answers

**Cause:** Function calling not configured or can't reach endpoint

**Check 1:** Provision logs show public URL
```
📡 Function Calling URL: https://[tunnel].trycloudflare.com/api/vapi/functions
✅ Public URL detected - Vapi can reach this!
```

**Check 2:** Test endpoint manually
```powershell
# Replace [tunnel] with your actual URL from logs
curl https://[tunnel].trycloudflare.com/api/vapi/functions
```

Should return:
```json
{"status":"ok","functions":["get_products","search_products"]}
```

**Check 3:** Re-provision the assistant
- Old assistant might have wrong URL
- Click "Provision Test Phone Number" again
- This creates a NEW assistant with the current tunnel URL

---

### Problem 3: AI hangs up after greeting

**Symptom:** AI says "Hello!" then immediately hangs up

**Cause:** Fixed in latest code (was detecting "thank you" as end phrase)

**Fix:** Re-provision the assistant
- Click "Provision Test Phone Number"
- This will use the updated configuration

---

### Problem 4: No logs appear during call

**Symptom:** Terminal shows nothing when AI tries to answer product questions

**Cause 1:** Wrong URL (localhost instead of tunnel)

**Fix:**
```powershell
# Check provision logs - should show:
✅ Public URL detected - Vapi can reach this!

# If it shows WARNING, restart servers in correct order:
# 1. shopify app dev
# 2. npm run dev
# 3. Re-provision assistant
```

**Cause 2:** API key mismatch

**Fix:**
```powershell
# Check your .env file
Select-String -Pattern "VAPI_API_KEY" .env

# Should show:
VAPI_API_KEY=92c92ccc-8c0b-416b-b059-47711e746ab8

# Re-provision to update the key
```

---

## 📱 Test Script for Phone Call

**Call:** `+1 (831) 200-2458`

**Test Script:**
```
1. Wait for greeting: "Hello! You've reached always-ai-dev-store..."

2. Ask: "What products do you sell?"
   Expected: AI lists actual products from your store

3. Ask: "Do you have t-shirts?"
   Expected: AI searches and tells you if t-shirts are available

4. Ask: "What else do you have?"
   Expected: AI provides more product information

5. Say: "Goodbye"
   Expected: AI says goodbye and hangs up cleanly
```

**What to Look For:**
- ✅ AI mentions real product names (not generic answers)
- ✅ AI provides prices
- ✅ AI tells you if items are available
- ✅ Logs show `[Vapi Functions]` messages in terminal

---

## 🎯 Success Checklist

Before testing, verify:

- [ ] Shopify CLI running (`shopify app dev`)
- [ ] Next.js dev server running (`npm run dev`)
- [ ] Logs show tunnel URL (`.trycloudflare.com`)
- [ ] Provision logs show "Public URL detected"
- [ ] `VAPI_API_KEY` set in `.env` file
- [ ] `VAPI_TEST_PHONE_NUMBER` set in `.env` file

During test call:

- [ ] Phone rings when you call
- [ ] AI answers with greeting
- [ ] AI responds to product questions with real data
- [ ] Terminal shows `[Vapi Functions]` logs
- [ ] AI doesn't hang up prematurely
- [ ] Clean hangup on "goodbye"

---

## 🔄 When You Restart Development

**Every time you restart `shopify app dev`:**

1. Tunnel URL **changes** → `https://[new-random].trycloudflare.com`
2. Old Vapi assistants have **old URL** → still work until CLI restarts
3. You need to **re-provision** → creates new assistant with new URL

**Workflow:**
```powershell
# 1. Restart both servers
shopify app dev     # Terminal 1
npm run dev         # Terminal 2

# 2. Re-provision assistant
# Go to /test/vapi → Click "Provision Test Phone Number"

# 3. Test immediately
# Call the number and ask about products
```

---

## 📚 More Information

- **Full Setup Guide:** `VAPI_PUBLIC_URL_SETUP.md`
- **Function Endpoint:** `src/app/api/vapi/functions/route.ts`
- **Provisioning Code:** `src/app/api/vapi/test/provision/route.ts`
- **Available Functions:**
  - `get_products` - Lists products
  - `search_products` - Searches by keyword

---

## 🆘 Still Not Working?

1. **Check both terminals** are running
2. **Look for the tunnel URL** in Next.js logs: `.trycloudflare.com`
3. **Test the endpoint** with curl (see Problem 2 above)
4. **Re-provision** the assistant
5. **Call and watch the logs** during the call
6. **Share the terminal output** if you need help

The logs will show exactly what's happening!

