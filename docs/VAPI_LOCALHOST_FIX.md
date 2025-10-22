# Fix: Vapi Still Using localhost URL

## 🚨 Problem

You're getting this error again:
```
Provisioning failed: Test provisioning failed: serverUrl must be a valid URL. 
Hot tip, the protocol should be https://, but found https://localhost:3000/api/vapi/functions
```

## 🔍 Root Cause

The Vapi provisioning code is still using `localhost:3000` instead of the Vercel URL. This happens because:

1. **Environment variables not set in Vercel** - The code falls back to localhost
2. **Wrong environment variable priority** - Code is checking wrong variables first

## ⚡ Quick Fix

### Step 1: Check Environment Variables in Vercel

Go to: https://vercel.com → Your Project → **Settings** → **Environment Variables**

**Required variables:**
```bash
NEXT_PUBLIC_APP_URL=https://shopify-receptionist.vercel.app
SHOPIFY_APP_URL=https://shopify-receptionist.vercel.app
```

**Critical:** Both variables must be set to the Vercel URL!

### Step 2: Check Current Values

The provisioning code checks these in order:
1. `tunnelUrl` (from request body) - usually not provided
2. `process.env.SHOPIFY_APP_URL` - should be Vercel URL
3. `process.env.NEXT_PUBLIC_APP_URL` - should be Vercel URL

### Step 3: Force Redeploy

1. **Deployments** → Latest → **⋯** → **Redeploy**
2. **Uncheck** "Use existing Build Cache"
3. Wait for fresh deployment

---

## 🔧 Code Analysis

The provisioning code does this:

```typescript
// Line 27-28 in /api/vapi/test/provision/route.ts
const shopifyAppUrl = tunnelUrl || process.env.SHOPIFY_APP_URL;
const nextPublicUrl = process.env.NEXT_PUBLIC_APP_URL;

// Line 38
const serverBaseUrl = shopifyAppUrl || nextPublicUrl;
```

**If both are undefined or localhost, it uses localhost!**

---

## 🧪 Debug Steps

### Step 1: Check What URL is Being Used

Look at the Vercel logs when you click "Provision Test Phone Number":

```
[requestId] 🔍 Environment Check:
[requestId]    Tunnel URL (from request): NOT PROVIDED
[requestId]    SHOPIFY_APP_URL (env): [should be Vercel URL]
[requestId]    NEXT_PUBLIC_APP_URL (env): [should be Vercel URL]
[requestId]    Using: [should be Vercel URL]
```

### Step 2: Expected Output

**If working correctly:**
```
[requestId]    SHOPIFY_APP_URL (env): https://shopify-receptionist.vercel.app
[requestId]    NEXT_PUBLIC_APP_URL (env): https://shopify-receptionist.vercel.app
[requestId]    Using: https://shopify-receptionist.vercel.app
```

**If broken:**
```
[requestId]    SHOPIFY_APP_URL (env): NOT SET
[requestId]    NEXT_PUBLIC_APP_URL (env): NOT SET
[requestId]    Using: undefined
```

---

## 🔧 Manual Fix Options

### Option 1: Set Both Environment Variables

In Vercel, add both:
```bash
SHOPIFY_APP_URL=https://shopify-receptionist.vercel.app
NEXT_PUBLIC_APP_URL=https://shopify-receptionist.vercel.app
```

### Option 2: Update Code to Force Vercel URL

If environment variables aren't working, we can hardcode the Vercel URL temporarily:

**File:** `src/app/api/vapi/test/provision/route.ts`

Change line 38:
```typescript
// OLD
const serverBaseUrl = shopifyAppUrl || nextPublicUrl;

// NEW (temporary fix)
const serverBaseUrl = shopifyAppUrl || nextPublicUrl || 'https://shopify-receptionist.vercel.app';
```

### Option 3: Check Vercel Environment

1. Go to **Functions** tab in Vercel
2. Look for environment variable loading errors
3. Check if variables are being loaded at runtime

---

## 🎯 Most Likely Solution

**The issue is probably that `SHOPIFY_APP_URL` is not set in Vercel.**

**Fix:**
1. Go to Vercel → Settings → Environment Variables
2. Add: `SHOPIFY_APP_URL=https://shopify-receptionist.vercel.app`
3. Redeploy

**Why this happens:**
- `SHOPIFY_APP_URL` is automatically set by Shopify CLI during local development
- In production (Vercel), you must set it manually
- The code prioritizes `SHOPIFY_APP_URL` over `NEXT_PUBLIC_APP_URL`

---

## ✅ Verification

After setting the environment variables and redeploying:

1. **Click "Provision Test Phone Number"**
2. **Check Vercel logs** for:
   ```
   [requestId] ✅ Public URL validated: https://shopify-receptionist.vercel.app/api/vapi/functions
   ```
3. **Should work without localhost error**

---

## 🚀 Quick Action

**Right now:**
1. Add `SHOPIFY_APP_URL=https://shopify-receptionist.vercel.app` to Vercel
2. Redeploy without cache
3. Test provisioning - should use Vercel URL ✅

This is the same issue we solved before - environment variables not properly set in Vercel!