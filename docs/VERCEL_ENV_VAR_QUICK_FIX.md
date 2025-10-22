# Quick Fix: Missing NEXT_PUBLIC_SHOPIFY_API_KEY

## 🚨 Current Issue

You're seeing this error in the browser console:
```
[AppBridge] ❌ Missing NEXT_PUBLIC_SHOPIFY_API_KEY environment variable
```

This is because the App Bridge Provider needs the API key to initialize, but it's not set in Vercel.

---

## ⚡ Quick Fix (5 minutes)

### Step 1: Go to Vercel Dashboard

1. Open: https://vercel.com
2. Click on your project: **shopify-receptionist**
3. Go to: **Settings** tab
4. Click: **Environment Variables** in the left sidebar

### Step 2: Add the Missing Variable

1. Click **Add New** button
2. Fill in:
   - **Name:** `NEXT_PUBLIC_SHOPIFY_API_KEY`
   - **Value:** `a0563782e38f84b7ce2ef0d2f5b87ed5`
   - **Environment:** Select **Production** (and optionally Preview/Development)
3. Click **Save**

### Step 3: Redeploy

1. Go to **Deployments** tab
2. Find the latest deployment
3. Click **⋯** (three dots) → **Redeploy**
4. Choose **Use existing Build Cache**
5. Wait ~1-2 minutes

### Step 4: Test

1. Go to: https://shopify-receptionist.vercel.app
2. Open browser console (F12)
3. Should see: `[AppBridge] API Key: configured` ✅
4. No more error about missing API key

---

## 🔍 Why This Happens

### The Problem:
- **Server-side code** can access: `process.env.SHOPIFY_API_KEY`
- **Client-side code** (like App Bridge) can only access: `process.env.NEXT_PUBLIC_SHOPIFY_API_KEY`

### The Solution:
We need the **same value** available in both contexts:

```bash
# Server-side (API routes, middleware)
SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5

# Client-side (App Bridge, components)  
NEXT_PUBLIC_SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5
```

**Important:** They must be the **exact same value**!

---

## 📋 Complete Environment Variables List

While you're in Vercel, add these other required variables:

### Required for OAuth:
```bash
SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5
SHOPIFY_API_SECRET=shpss_YOUR_SECRET_HERE
SHOPIFY_SCOPES=read_customers,read_orders,read_products
NEXT_PUBLIC_APP_URL=https://shopify-receptionist.vercel.app
```

### Required for App Bridge:
```bash
NEXT_PUBLIC_SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5
```

### Required for Database:
```bash
SUPABASE_URL=https://ezoyrjzzynmxdoorpokr.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Required for Vapi:
```bash
VAPI_API_KEY=92c92ccc-8c0b-416b-b059-47711e746ab8
VAPI_PUBLIC_KEY=296470fc-f13b-4fa5-8f13-d486182c1880
VAPI_TEST_PHONE_NUMBER=+18312002458
```

### Optional:
```bash
NODE_ENV=production
```

---

## ✅ After Adding Variables

### Expected Console Output:
```javascript
[AppBridge] Initializing in embedded mode
[AppBridge] Shop: always-ai-dev-store.myshopify.com
[AppBridge] Host: present
[AppBridge] API Key: configured ✅
```

### No More Errors:
- ❌ `Missing NEXT_PUBLIC_SHOPIFY_API_KEY environment variable`
- ❌ `Provider is not exported from '@shopify/app-bridge-react'`

---

## 🐛 If Still Having Issues

### Issue: "Provider is not exported"
**Fix:** Already fixed in the code - the import is now correct:
```typescript
import { Provider } from '@shopify/app-bridge-react';
```

### Issue: Variables not taking effect
**Fix:** Must redeploy after adding variables:
1. Deployments → Latest → ⋯ → Redeploy
2. Wait for deployment to complete

### Issue: Still seeing missing API key
**Fix:** 
1. Double-check variable name: `NEXT_PUBLIC_SHOPIFY_API_KEY`
2. Double-check value: `a0563782e38f84b7ce2ef0d2f5b87ed5`
3. Ensure it's set for **Production** environment
4. Clear browser cache and reload

---

## 🎯 Quick Action

**Right now:**
1. Add `NEXT_PUBLIC_SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5` to Vercel
2. Redeploy
3. Test - error should be gone!

**This will fix the App Bridge initialization issue immediately!** 🚀
