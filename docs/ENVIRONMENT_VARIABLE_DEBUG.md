# Environment Variable Debug Guide

## 🚨 Problem

`NEXT_PUBLIC_SHOPIFY_API_KEY` is set in Vercel but the app can't access it at runtime.

## 🔍 Debug Steps

### Step 1: Test API Route Created

**File:** `src/app/api/test-env/route.ts`

**Access:** https://shopify-receptionist.vercel.app/api/test-env

**This will show:**
- All environment variables available at runtime
- Specific NEXT_PUBLIC variables
- Vercel system variables
- Total count of environment variables

### Step 2: Check Vercel Environment Variable Settings

**Go to:** https://vercel.com → Your Project → **Settings** → **Environment Variables**

**Verify:**
- ✅ **Name:** `NEXT_PUBLIC_SHOPIFY_API_KEY` (exact spelling, no spaces)
- ✅ **Value:** `a0563782e38f84b7ce2ef0d2f5b87ed5`
- ✅ **Environment:** Production (and Preview if testing)
- ✅ **No extra spaces or characters**

### Step 3: Force Complete Rebuild

**In Vercel Dashboard:**
1. Go to **Settings** → **General**
2. Click **"Clear Build Cache"**
3. Go to **Deployments** → Latest → **⋯** → **Redeploy**
4. **Uncheck** "Use existing Build Cache"

### Step 4: Check next.config.js

**Updated to explicitly include the variable:**
```javascript
env: {
  SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL || process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SHOPIFY_API_KEY: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY, // ✅ Added
},
```

### Step 5: Verify AppBridgeProvider Access

**Current code in AppBridgeProvider.tsx:**
```typescript
// Get API key from environment
const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
```

**This is correct for client-side access.**

---

## 🧪 Testing Process

### 1. Call Test API Route

**URL:** https://shopify-receptionist.vercel.app/api/test-env

**Expected Response:**
```json
{
  "success": true,
  "debug": {
    "nodeEnv": "production",
    "vercel": "1",
    "vercelEnv": "production",
    "vercelUrl": "https://shopify-receptionist.vercel.app",
    "nextPublicVars": ["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SHOPIFY_API_KEY"],
    "specificVars": {
      "NEXT_PUBLIC_SHOPIFY_API_KEY": "a0563782e38f84b7ce2ef0d2f5b87ed5",
      "NEXT_PUBLIC_APP_URL": "https://shopify-receptionist.vercel.app"
    }
  }
}
```

### 2. Check Browser Console

**In Shopify Admin:**
1. Go to: https://always-ai-dev-store.myshopify.com/admin
2. Click **Apps** → **Always AI Call Receptionist**
3. Open browser console (F12)
4. Look for debug output:

```javascript
[DEBUG] === Environment Variables Debug ===
[DEBUG] NODE_ENV: production
[DEBUG] NEXT_PUBLIC_SHOPIFY_API_KEY: a0563782e38f84b7ce2ef0d2f5b87ed5
[DEBUG] NEXT_PUBLIC_APP_URL: https://shopify-receptionist.vercel.app
[DEBUG] All NEXT_PUBLIC vars: ["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SHOPIFY_API_KEY"]
[DEBUG] === End Debug ===
```

---

## 🔧 Common Issues & Solutions

### Issue 1: Variable Not Set for Correct Environment

**Symptom:** Test API shows `NEXT_PUBLIC_SHOPIFY_API_KEY: undefined`

**Fix:** In Vercel, ensure variable is set for **Production** environment

### Issue 2: Typo in Variable Name

**Symptom:** Variable not appearing in `nextPublicVars` array

**Fix:** Check exact spelling: `NEXT_PUBLIC_SHOPIFY_API_KEY`

### Issue 3: Build Cache Issues

**Symptom:** Variable set but not accessible

**Fix:** Clear build cache and redeploy

### Issue 4: Next.js Not Including Variable

**Symptom:** Variable set in Vercel but not in runtime

**Fix:** Added to `next.config.js` explicitly:
```javascript
env: {
  NEXT_PUBLIC_SHOPIFY_API_KEY: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
}
```

### Issue 5: Client vs Server Access

**Symptom:** Variable available server-side but not client-side

**Fix:** Use `NEXT_PUBLIC_` prefix for client-side access

---

## 📊 Expected Results

### Test API Route Output:
```json
{
  "success": true,
  "debug": {
    "nextPublicVars": ["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SHOPIFY_API_KEY"],
    "specificVars": {
      "NEXT_PUBLIC_SHOPIFY_API_KEY": "a0563782e38f84b7ce2ef0d2f5b87ed5"
    }
  }
}
```

### Browser Console Output:
```javascript
[DEBUG] NEXT_PUBLIC_SHOPIFY_API_KEY: a0563782e38f84b7ce2ef0d2f5b87ed5
[AppBridge] ✅ App Bridge v4+ initialized successfully
```

### No More Errors:
- ❌ `[AppBridge] ❌ Missing NEXT_PUBLIC_SHOPIFY_API_KEY environment variable`
- ❌ `[AppBridge] API Key: MISSING - Set NEXT_PUBLIC_SHOPIFY_API_KEY`

---

## 🎯 Action Items

### Immediate (5 minutes):
1. ✅ **Test API route created** (already done)
2. ✅ **next.config.js updated** (already done)
3. ⏳ **Call test API route** - https://shopify-receptionist.vercel.app/api/test-env
4. ⏳ **Check Vercel environment variable settings**
5. ⏳ **Clear build cache and redeploy**

### Debugging:
1. **Check test API response** - shows what variables are available
2. **Check browser console** - shows client-side access
3. **Verify Vercel settings** - ensure variable is set correctly

### Expected Outcome:
- ✅ Test API shows `NEXT_PUBLIC_SHOPIFY_API_KEY` is available
- ✅ Browser console shows the variable is accessible
- ✅ App Bridge initializes successfully
- ✅ No more missing API key errors

---

## 🚀 Quick Test

**Right now:**
1. **Call:** https://shopify-receptionist.vercel.app/api/test-env
2. **Check response** for `NEXT_PUBLIC_SHOPIFY_API_KEY`
3. **If undefined:** Check Vercel environment variable settings
4. **If set:** Check browser console in Shopify Admin

**This will tell us exactly what's happening with the environment variables!** 🔍
