# Production Deployment Checklist

## 🚀 Complete Configuration Guide

Follow these steps in order to complete your Vercel deployment.

---

## ✅ Status: What's Done

- [x] **Code deployed to Vercel** (commit: `65c3992`)
- [x] **Build configuration fixed** (TypeScript, linting, dynamic rendering)
- [x] **App available at:** https://shopify-receptionist.vercel.app

---

## 🔧 Step 1: Configure Shopify Partner Dashboard

### Instructions:
See: [`docs/SHOPIFY_PARTNER_DASHBOARD_SETUP.md`](SHOPIFY_PARTNER_DASHBOARD_SETUP.md)

### Quick Summary:

1. Go to: https://partners.shopify.com
2. Navigate to: **Apps → Your App → Configuration**
3. Update **App URL** to:
   ```
   https://shopify-receptionist.vercel.app
   ```
4. Update **Allowed redirection URL(s)** to:
   ```
   https://shopify-receptionist.vercel.app/api/auth/callback
   https://shopify-receptionist.vercel.app/api/auth
   https://shopify-receptionist.vercel.app/
   ```
5. Click **Save**

### Status: ⏳ **PENDING - Do this now**

---

## 🔧 Step 2: Configure Vercel Environment Variables

### Instructions:

1. Go to: https://vercel.com → Your Project → **Settings** → **Environment Variables**
2. Add the following variables:

### Required Variables:

```bash
# Shopify Configuration
SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5
SHOPIFY_API_SECRET=shpss_[YOUR_SECRET_HERE]
SHOPIFY_SCOPES=read_products,read_orders,read_customers

# Vapi Configuration
VAPI_API_KEY=92c92ccc-8c0b-416b-b059-47711e746ab8
VAPI_PUBLIC_KEY=296470fc-f13b-4fa5-8f13-d486182c1880
VAPI_TEST_PHONE_NUMBER=+18312002458

# Supabase Configuration
SUPABASE_URL=https://ezoyrjzzynmxdoorpokr.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...[YOUR_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]

# App URLs
NEXT_PUBLIC_APP_URL=https://shopify-receptionist.vercel.app
NODE_ENV=production
```

### Important Notes:

- ⚠️ **SHOPIFY_API_SECRET** - Get from Shopify Partners Dashboard
- ⚠️ **SUPABASE_SERVICE_ROLE_KEY** - Get from Supabase Dashboard
- ⚠️ Set environment to **"Production"** (not Preview or Development)
- ⚠️ After adding variables, click **"Redeploy"** for changes to take effect

### How to Redeploy:

1. Go to: **Deployments** tab
2. Find latest deployment
3. Click **⋯** (three dots)
4. Select **"Redeploy"**
5. Choose **"Use existing Build Cache"**
6. Wait ~1-2 minutes

### Status: ⏳ **PENDING - Do this after Shopify config**

---

## 🔧 Step 3: Update Vapi Assistant Configuration

### Instructions:

1. Go to: https://dashboard.vapi.ai
2. Click **Assistants** in sidebar
3. Find your assistant (likely "Test AI - always-ai-dev-store")
4. Click **Edit**
5. Scroll to **Server URL** section
6. Update to:
   ```
   https://shopify-receptionist.vercel.app/api/vapi/functions
   ```
7. Update **Server URL Secret** (if shown):
   ```
   92c92ccc-8c0b-416b-b059-47711e746ab8
   ```
   (Your VAPI_API_KEY value)
8. Click **Save**

### Alternative: Reprovision via App

If you prefer to create a fresh assistant with production URL:

1. Visit: https://shopify-receptionist.vercel.app/test/vapi
2. Delete existing test assistant (if any)
3. Click **"Provision Test Phone Number"**
4. This will create assistant with correct production URL

### Status: ⏳ **PENDING - Do this after Vercel env vars**

---

## 🧪 Step 4: Test Your Deployment

### Test 1: App Loads in Shopify Admin

1. Go to: https://always-ai-dev-store.myshopify.com/admin
2. Click **Apps** → **Your App Name**
3. **Expected:** App loads in iframe ✅
4. **If fails:** Check Shopify Partner Dashboard URLs

### Test 2: OAuth Flow Works

1. If prompted, click **"Install"** or **"Authorize"**
2. **Expected:** Redirects to callback, then to dashboard ✅
3. **If fails:** Check redirect URLs in Shopify Partners

### Test 3: Database Connection

1. Navigate around the app (Dashboard, Calls, Settings)
2. **Expected:** Pages load without errors ✅
3. **If fails:** Check Vercel environment variables

### Test 4: Vapi Phone Call

1. Call: +1 (831) 200-2458
2. **Expected:** AI answers and can list products ✅
3. **If fails:** 
   - Check Vapi assistant serverUrl
   - Check Vercel logs for function call errors
   - Verify Supabase connection

### Test 5: Check Vercel Logs

1. Go to: Vercel Dashboard → **Logs** or **Functions**
2. Make a test call or navigate in app
3. **Expected:** See logs, no errors ✅
4. Look for:
   - `[Vapi Functions]` logs (function calls)
   - `[OAuth Callback]` logs (authentication)
   - `[Shopify Products]` logs (product fetching)

### Status: ⏳ **PENDING - Do this after all configuration**

---

## 📊 Deployment Status Dashboard

### Quick Status Check:

| Component | Status | Action |
|-----------|--------|--------|
| **Vercel Build** | ✅ Ready | None - deployed |
| **Shopify Partner Config** | ⏳ Pending | Update URLs |
| **Vercel Env Variables** | ⏳ Pending | Add all variables |
| **Vapi Configuration** | ⏳ Pending | Update serverUrl |
| **Testing** | ⏳ Pending | Run all tests |

---

## 🎯 Success Criteria

Your deployment is complete when:

- [ ] Vercel deployment shows "Ready" status
- [ ] Shopify Partner Dashboard has Vercel URLs
- [ ] All environment variables set in Vercel
- [ ] Redeployed after adding env variables
- [ ] Vapi assistant serverUrl points to Vercel
- [ ] App loads in Shopify Admin
- [ ] OAuth flow completes successfully
- [ ] Dashboard displays without errors
- [ ] Phone call reaches AI and gets product data
- [ ] No errors in Vercel logs

---

## 🚨 Common Issues

### Issue: "Invalid redirect_uri"

**Fix:** Exact match required in Shopify Partners
```
✅ https://shopify-receptionist.vercel.app/api/auth/callback
❌ https://shopify-receptionist.vercel.app/api/auth/callback/
```

### Issue: Environment variables not working

**Fix:** Redeploy after adding variables
1. Vercel → Deployments → ⋯ → Redeploy

### Issue: Vapi function calls fail

**Fix:** Update Vapi assistant serverUrl
```
https://shopify-receptionist.vercel.app/api/vapi/functions
```

### Issue: Database errors

**Fix:** Verify SUPABASE_SERVICE_ROLE_KEY is set in Vercel

---

## 📝 Order of Operations

**Important:** Follow this order to avoid issues:

1. **First:** Configure Shopify Partner Dashboard
   - Sets up OAuth flow
   - Required before app can be loaded

2. **Second:** Configure Vercel Environment Variables
   - Required for app functionality
   - Must redeploy after adding

3. **Third:** Update Vapi Assistant
   - Requires Vercel URL to be working
   - Enables function calls during phone conversations

4. **Finally:** Test Everything
   - Verify each component works
   - Check logs for errors

---

## 🎉 You're Almost Done!

The hard part (getting the build to succeed) is complete! Now it's just configuration.

Follow the steps above in order, and you'll have a fully functional production deployment! 🚀

---

## 📚 Related Documentation

- [`SHOPIFY_PARTNER_DASHBOARD_SETUP.md`](SHOPIFY_PARTNER_DASHBOARD_SETUP.md) - Shopify configuration
- [`VERCEL_DEPLOYMENT_GUIDE.md`](VERCEL_DEPLOYMENT_GUIDE.md) - Original deployment guide
- [`VAPI_QUICK_START.md`](VAPI_QUICK_START.md) - Vapi configuration details
- [`POST_DEPLOYMENT_CHECKLIST.md`](POST_DEPLOYMENT_CHECKLIST.md) - Post-deployment tasks

