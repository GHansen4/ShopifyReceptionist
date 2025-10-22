# Fix: Multiple App Bridge Issues

## 🚨 Current Issues

You're seeing these errors:

1. **Missing host parameter** - `[AppBridge] ⚠️ Embedded but missing host parameter`
2. **Missing API key** - `[AppBridge] ❌ Missing NEXT_PUBLIC_SHOPIFY_API_KEY environment variable`
3. **Import error** - `'Provider' is not exported from '@shopify/app-bridge-react'`

## 🔧 Fixes Applied

### 1. Fixed Import Error ✅

**Problem:** Wrong import syntax for App Bridge version 4.2.7

**Fixed:**
```typescript
// OLD (wrong)
import { Provider } from '@shopify/app-bridge-react';

// NEW (correct)
import { AppProvider } from '@shopify/app-bridge-react';
```

### 2. Missing Environment Variable ⏳

**Problem:** `NEXT_PUBLIC_SHOPIFY_API_KEY` not set in Vercel

**Fix:** Add to Vercel environment variables:
```bash
NEXT_PUBLIC_SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5
```

### 3. Missing Host Parameter ⚠️

**Problem:** App is running in standalone mode (not embedded in Shopify Admin)

**This is normal when:**
- Testing the app directly (not through Shopify Admin)
- App is not properly embedded in iframe
- Missing Shopify parameters in URL

---

## ⚡ Quick Fix Steps

### Step 1: Add Environment Variable to Vercel

1. Go to: https://vercel.com → Your Project → **Settings** → **Environment Variables**
2. Add:
   - **Name:** `NEXT_PUBLIC_SHOPIFY_API_KEY`
   - **Value:** `a0563782e38f84b7ce2ef0d2f5b87ed5`
   - **Environment:** Production
3. Click **Save**

### Step 2: Redeploy

1. **Deployments** → Latest → **⋯** → **Redeploy**
2. **Uncheck** "Use existing Build Cache"
3. Wait for deployment

### Step 3: Test in Shopify Admin

**Don't test directly on Vercel URL!**

1. Go to: https://always-ai-dev-store.myshopify.com/admin
2. Click **Apps** → **Always AI Call Receptionist**
3. App should load with host parameter ✅

---

## 🔍 Understanding the Issues

### Issue 1: Missing Host Parameter

**When you see:** `[AppBridge] ⚠️ Embedded but missing host parameter`

**Cause:** App is running in standalone mode (not embedded)

**Normal when:**
- Testing at: https://shopify-receptionist.vercel.app (direct access)
- Missing Shopify parameters in URL

**Fixed when:**
- Accessing through Shopify Admin
- URL includes: `?shop=...&host=...`

### Issue 2: Missing API Key

**When you see:** `[AppBridge] ❌ Missing NEXT_PUBLIC_SHOPIFY_API_KEY environment variable`

**Cause:** Environment variable not set in Vercel

**Fix:** Add `NEXT_PUBLIC_SHOPIFY_API_KEY` to Vercel

### Issue 3: Import Error

**When you see:** `'Provider' is not exported from '@shopify/app-bridge-react'`

**Cause:** Wrong import syntax for version 4.2.7

**Fixed:** Changed to `AppProvider` import

---

## 🧪 Testing Steps

### Test 1: Direct Access (Should Show Warnings)

1. Go to: https://shopify-receptionist.vercel.app
2. **Expected:** Warnings about missing host parameter (normal)
3. **Expected:** Error about missing API key (until you add env var)

### Test 2: Shopify Admin Access (Should Work)

1. Go to: https://always-ai-dev-store.myshopify.com/admin
2. Click **Apps** → **Always AI Call Receptionist**
3. **Expected:** No warnings, App Bridge initializes properly

### Test 3: Check Console Logs

**After adding environment variable, you should see:**
```javascript
[DEBUG] === Environment Variables Debug ===
[DEBUG] NODE_ENV: production
[DEBUG] NEXT_PUBLIC_SHOPIFY_API_KEY: a0563782e38f84b7ce2ef0d2f5b87ed5
[DEBUG] NEXT_PUBLIC_APP_URL: https://shopify-receptionist.vercel.app
[DEBUG] === End Debug ===

[AppBridge] Initializing in embedded mode
[AppBridge] Shop: always-ai-dev-store.myshopify.com
[AppBridge] Host: present
[AppBridge] API Key: configured ✅
```

---

## 📊 Expected Behavior

### Direct Access (Standalone Mode)
```
[AppBridge] Running in standalone mode (not embedded)
[AppBridge] ⚠️ Embedded but missing host parameter
[AppBridge] ❌ Missing NEXT_PUBLIC_SHOPIFY_API_KEY environment variable
```

**This is normal** - the app works but without App Bridge features.

### Shopify Admin Access (Embedded Mode)
```
[AppBridge] Initializing in embedded mode
[AppBridge] Shop: always-ai-dev-store.myshopify.com
[AppBridge] Host: present
[AppBridge] API Key: configured ✅
```

**This is the goal** - full App Bridge functionality.

---

## 🎯 Action Items

### Immediate (5 minutes):
1. ✅ **Import error fixed** (already done)
2. ⏳ **Add `NEXT_PUBLIC_SHOPIFY_API_KEY` to Vercel**
3. ⏳ **Redeploy without cache**

### Testing:
1. **Don't test direct Vercel URL** - it will show warnings
2. **Test through Shopify Admin** - this is the real test
3. **Check console logs** for proper initialization

---

## 🚀 After Fix

**You should see:**
- ✅ No import errors
- ✅ No missing API key errors
- ✅ App Bridge initializes in Shopify Admin
- ✅ App works properly embedded in iframe

**The warnings about missing host parameter are normal when testing directly - only test through Shopify Admin!**
