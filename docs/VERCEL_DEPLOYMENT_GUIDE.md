# 🚀 Vercel Deployment Guide

## Prerequisites

- GitHub account with code pushed ✅ (Done!)
- Vercel account (free tier works)
- Environment variables ready

---

## Step 1: Connect to Vercel

1. **Go to:** https://vercel.com
2. **Sign in** with GitHub
3. **Click:** "Add New" → "Project"
4. **Import:** `GHansen4/ShopifyReceptionist`

---

## Step 2: Configure Environment Variables

**CRITICAL:** Add these in Vercel project settings before deploying!

### **Required Variables:**

```bash
# Shopify Configuration
SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5
SHOPIFY_API_SECRET=shpss_YOUR_ACTUAL_SECRET_HERE
SHOPIFY_SCOPES=read_products,read_orders,read_customers

# Vapi Configuration
VAPI_API_KEY=92c92ccc-8c0b-416b-b059-47711e746ab8
VAPI_PUBLIC_KEY=296470fc-f13b-4fa5-8f13-d486182c1880

# Supabase Configuration
SUPABASE_URL=https://ezoyrjzzynmxdoorpokr.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6b3lyanp6eW5teGRvb3Jwb2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjgwMzYsImV4cCI6MjA3NjU0NDAzNn0.rwoAXtVRasmb_WvPs7o89E8j_o8zuyeMnra5mOVLbw8
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

# App Configuration
NEXT_PUBLIC_APP_URL=https://YOUR_VERCEL_APP_URL.vercel.app
NODE_ENV=production
```

### **Optional (for monitoring):**

```bash
# Sentry (optional - for error tracking)
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=
```

---

## Step 3: Where to Add Variables in Vercel

### **In Vercel Dashboard:**

1. **Go to:** Project Settings
2. **Click:** Environment Variables (in sidebar)
3. **Add each variable:**
   - Key: `SHOPIFY_API_KEY`
   - Value: (paste your value)
   - Environment: Check **Production**, **Preview**, **Development**
   - Click "Add"

**Repeat for each variable above.**

---

## Step 4: Important Notes

### **🔴 SHOPIFY_API_SECRET**

**Where to find:**
1. Go to: https://partners.shopify.com
2. Apps → Your app → Configuration
3. Copy the "API secret key"

**⚠️ This is NOT the same as your API key!**

---

### **🔴 SUPABASE_SERVICE_ROLE_KEY**

**Where to find:**
1. Go to: https://supabase.com/dashboard
2. Your project → Settings → API
3. Copy "service_role" key (NOT the anon key)

**⚠️ Never expose this publicly - only use in server-side code**

---

### **🔴 NEXT_PUBLIC_APP_URL**

**Set to your Vercel URL:**
- First deployment: Use `https://shopify-receptionist.vercel.app` (or whatever Vercel gives you)
- After deployment: Update this variable with actual URL
- **Also update in Shopify app settings!**

---

## Step 5: Deploy

1. **In Vercel dashboard:**
   - Click "Deploy"
   - Wait 2-3 minutes
   - You'll get a URL like: `https://shopify-receptionist-xyz.vercel.app`

2. **After deployment:**
   - Go back to Environment Variables
   - Update `NEXT_PUBLIC_APP_URL` with your actual Vercel URL
   - Click "Redeploy" to apply the change

---

## Step 6: Update Shopify App Configuration

After deployment, update your Shopify app:

1. **Go to:** https://partners.shopify.com
2. **Your app** → Configuration
3. **Update URLs:**
   - App URL: `https://YOUR_VERCEL_URL.vercel.app`
   - Allowed redirection URLs:
     - `https://YOUR_VERCEL_URL.vercel.app/api/auth/callback`

4. **Click:** Save

---

## Step 7: Update Vapi Assistant

Your assistant still has the old tunnel URL. Update it:

### **Option A: Via Vapi Dashboard**

1. Go to: https://dashboard.vapi.ai
2. Find your assistant
3. Update `serverUrl` to:
   ```
   https://YOUR_VERCEL_URL.vercel.app/api/vapi/functions
   ```
4. Ensure `serverUrlSecret` is your `VAPI_API_KEY`

### **Option B: Reprovision**

1. Go to your app: `https://YOUR_VERCEL_URL.vercel.app/test/vapi`
2. Enter tunnel URL: `https://YOUR_VERCEL_URL.vercel.app`
3. Click "Provision Test Phone Number"
4. This creates a new assistant with the production URL

---

## Step 8: Test

1. **Visit your app:**
   ```
   https://YOUR_VERCEL_URL.vercel.app
   ```

2. **Call your Vapi phone number:** `+1 (831) 200-2458`

3. **Ask:** "What products do you sell?"

4. **Expected:** Agent fetches and lists products ✅

---

## Troubleshooting

### **Issue: "Cannot reach origin service"**

**Cause:** `NEXT_PUBLIC_APP_URL` not set correctly

**Fix:**
- Update `NEXT_PUBLIC_APP_URL` in Vercel
- Use exact Vercel URL (with https://)
- Redeploy

---

### **Issue: "Store not authenticated"**

**Cause:** No Shopify session in database

**Fix:**
1. Visit app via Shopify Admin
2. This triggers OAuth flow
3. Session saved to database

---

### **Issue: Function calls fail**

**Cause:** Vapi assistant has old tunnel URL

**Fix:**
- Update assistant `serverUrl` in Vapi dashboard
- Or reprovision with new URL

---

## Quick Checklist

Before deploying:

- [ ] All environment variables added in Vercel
- [ ] `SHOPIFY_API_SECRET` is the actual secret (not API key)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set (not anon key)
- [ ] Ready to update `NEXT_PUBLIC_APP_URL` after first deploy

After deploying:

- [ ] Updated `NEXT_PUBLIC_APP_URL` with Vercel URL
- [ ] Redeployed to apply URL change
- [ ] Updated Shopify app configuration with Vercel URL
- [ ] Updated Vapi assistant `serverUrl` with Vercel URL
- [ ] Tested phone call with product questions

---

## Production URL Structure

Once deployed, your URLs will be:

```
Production App:
https://YOUR_APP.vercel.app

Vapi Test Page:
https://YOUR_APP.vercel.app/test/vapi

Function Endpoint (for Vapi):
https://YOUR_APP.vercel.app/api/vapi/functions

OAuth Callback:
https://YOUR_APP.vercel.app/api/auth/callback
```

---

## Benefits of Production Deployment

✅ **No tunnel needed** - Vercel URL is public and stable
✅ **Always available** - Not dependent on local dev server
✅ **Fast and reliable** - Vercel's CDN and infrastructure
✅ **Easy updates** - Just push to GitHub, auto-deploys
✅ **Real HTTPS** - Proper SSL certificate
✅ **Environment separation** - Dev vs Production

---

## Cost

**Vercel Free Tier:**
- ✅ Unlimited deployments
- ✅ Automatic HTTPS
- ✅ 100GB bandwidth/month
- ✅ More than enough for testing

**You're ready to deploy!** 🚀

