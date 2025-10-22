# ✅ Post-Deployment Checklist

Your app is live at: **https://shopify-receptionist.vercel.app/**

Complete these steps to make it fully functional:

---

## Step 1: Update NEXT_PUBLIC_APP_URL in Vercel ⚠️ CRITICAL

1. **Go to:** https://vercel.com/your-project/settings/environment-variables
2. **Find:** `NEXT_PUBLIC_APP_URL`
3. **Update to:** `https://shopify-receptionist.vercel.app`
4. **Select:** Production, Preview, Development
5. **Click:** Save

**Then redeploy:**
- Go to Deployments tab
- Click ⋯ (three dots) on latest deployment
- Click "Redeploy"
- Check "Use existing Build Cache" ✓
- Click "Redeploy"

---

## Step 2: Update Shopify App Configuration

1. **Go to:** https://partners.shopify.com
2. **Navigate to:** Apps → Always AI Call Receptionist → Configuration
3. **Update these URLs:**

   **App URL:**
   ```
   https://shopify-receptionist.vercel.app
   ```

   **Allowed redirection URL(s):**
   ```
   https://shopify-receptionist.vercel.app/api/auth/callback
   ```

4. **Click:** Save

---

## Step 3: Update Vapi Assistant

Your assistant still has the old tunnel URL. Update it:

### Option A: Via Vapi Dashboard (Recommended)

1. **Go to:** https://dashboard.vapi.ai
2. **Find your assistant** (Test AI - always-ai-dev-store or similar)
3. **Update:**
   - **Server URL:** `https://shopify-receptionist.vercel.app/api/vapi/functions`
   - **Server URL Secret:** Your `VAPI_API_KEY` (should already be set)
4. **Save**

### Option B: Reprovision (Creates New Assistant)

1. **Go to:** https://shopify-receptionist.vercel.app/test/vapi?shop=always-ai-dev-store.myshopify.com
2. **In "Tunnel URL" field, enter:** `https://shopify-receptionist.vercel.app`
3. **Click:** "Provision Test Phone Number"
4. **This creates a new assistant with production URL**

---

## Step 4: Test Authentication

1. **Visit:** https://shopify-receptionist.vercel.app
2. **Expected:** You'll be redirected to Shopify for OAuth
3. **After authorizing:** You'll see the dashboard
4. **This saves your Shopify access token to the database**

**If you get errors:**
- Check Shopify app URLs are correct
- Check redirect URL matches exactly
- Check Vercel environment variables are set

---

## Step 5: Test Vapi Functions

1. **Call your phone number:** `+1 (831) 200-2458`
2. **Say:** "Hello"
3. **Agent says:** "Hello! You've reached always-ai-dev-store..."
4. **Ask:** "What products do you sell?"
5. **Expected:** Agent fetches and lists your products ✅

**If function calls fail:**
- Check Vercel logs for errors
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Verify assistant `serverUrl` is updated
- Make sure you completed Step 4 (authentication)

---

## Step 6: Check Vercel Logs (If Issues)

1. **Go to:** Vercel Dashboard → Your Project
2. **Click:** Functions tab (or Logs)
3. **Look for:**
   ```
   [Vapi Functions] Received function call
   [get_products] Fetching products
   ```

**If you see these logs:** Functions are working! ✅

**If you see errors:** Tell me what they say and I'll help debug

---

## Quick URLs Reference

| Purpose | URL |
|---------|-----|
| **Production App** | https://shopify-receptionist.vercel.app |
| **Vapi Test Page** | https://shopify-receptionist.vercel.app/test/vapi |
| **OAuth Callback** | https://shopify-receptionist.vercel.app/api/auth/callback |
| **Vapi Functions** | https://shopify-receptionist.vercel.app/api/vapi/functions |
| **Shopify Partners** | https://partners.shopify.com |
| **Vapi Dashboard** | https://dashboard.vapi.ai |
| **Vercel Dashboard** | https://vercel.com |
| **Supabase Dashboard** | https://supabase.com/dashboard |

---

## Troubleshooting

### "Cannot reach the origin service"

**Cause:** Old tunnel URL in Vapi assistant

**Fix:** Update assistant `serverUrl` (Step 3)

---

### "Store not authenticated"

**Cause:** No Shopify session in database

**Fix:** Visit app via Shopify Admin to trigger OAuth (Step 4)

---

### "Function calls don't work"

**Cause:** Missing environment variables or wrong configuration

**Check:**
1. All Vercel environment variables set?
2. Redeployed after updating `NEXT_PUBLIC_APP_URL`?
3. Vapi assistant `serverUrl` updated?
4. Authenticated with Shopify (Step 4)?

---

## ✅ Success Checklist

- [ ] Updated `NEXT_PUBLIC_APP_URL` in Vercel
- [ ] Redeployed Vercel app
- [ ] Updated Shopify app URLs
- [ ] Updated Vapi assistant serverUrl
- [ ] Authenticated via Shopify Admin
- [ ] Tested phone call with product questions
- [ ] Agent successfully fetches and lists products

---

## 🎉 When Everything Works

You should be able to:

1. ✅ Visit app via Shopify Admin
2. ✅ See dashboard with system status
3. ✅ Call phone number and agent answers
4. ✅ Ask about products and get real answers
5. ✅ Conversation flows naturally
6. ✅ Call logs appear in Vapi dashboard

**You're live in production!** 🚀

