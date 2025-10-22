# Debug: Environment Variables Not Working

## 🔍 Troubleshooting Steps

### Step 1: Verify Variable is Set in Vercel

1. Go to: https://vercel.com → Your Project → **Settings** → **Environment Variables**
2. Look for: `NEXT_PUBLIC_SHOPIFY_API_KEY`
3. Check:
   - ✅ **Name:** `NEXT_PUBLIC_SHOPIFY_API_KEY` (exact spelling)
   - ✅ **Value:** `a0563782e38f84b7ce2ef0d2f5b87ed5`
   - ✅ **Environment:** Production (and/or Preview/Development)

### Step 2: Check if Variable is Accessible

Add this temporary debug code to see what's happening:

**File:** `src/components/providers/AppBridgeProvider.tsx`

Add this debug logging (temporarily):

```typescript
// Add this after line 25 (after const apiKey = ...)
console.log('[DEBUG] Environment check:');
console.log('[DEBUG] NODE_ENV:', process.env.NODE_ENV);
console.log('[DEBUG] NEXT_PUBLIC_SHOPIFY_API_KEY:', process.env.NEXT_PUBLIC_SHOPIFY_API_KEY);
console.log('[DEBUG] All NEXT_PUBLIC vars:', Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')));
```

### Step 3: Check Vercel Deployment

1. Go to: **Deployments** tab
2. Click on the latest deployment
3. Check **Build Logs** for any environment variable warnings
4. Look for: `NEXT_PUBLIC_SHOPIFY_API_KEY` in the logs

### Step 4: Force Redeploy

Sometimes Vercel caches environment variables:

1. **Deployments** → Latest deployment → **⋯** → **Redeploy**
2. Choose **"Use existing Build Cache"** = **NO** (uncheck this)
3. This forces a fresh build with all environment variables

---

## 🐛 Common Issues & Solutions

### Issue 1: Variable Name Typo

**Check:** Is it exactly `NEXT_PUBLIC_SHOPIFY_API_KEY`?

**Common mistakes:**
- ❌ `NEXT_PUBLIC_SHOPIFY_API_KEY` (missing underscore)
- ❌ `NEXT_PUBLIC_SHOPIFY_APIKEY` (missing underscore)
- ❌ `NEXT_PUBLIC_SHOPIFY_API_KEY` (extra space)

### Issue 2: Wrong Environment

**Check:** Is it set for the right environment?

- **Production:** For live app (https://shopify-receptionist.vercel.app)
- **Preview:** For preview deployments
- **Development:** For local development

**Fix:** Make sure it's set for **Production** (or all environments)

### Issue 3: Build Cache

**Problem:** Vercel cached the build without the environment variable

**Fix:** 
1. Redeploy with **"Use existing Build Cache"** = **NO**
2. Or delete the deployment and redeploy

### Issue 4: Client-Side vs Server-Side

**Problem:** Variable is set but not accessible client-side

**Check:** Only `NEXT_PUBLIC_*` variables are available in browser

**Server-side (API routes):**
```typescript
// ✅ Works
process.env.SHOPIFY_API_KEY
process.env.SUPABASE_URL
```

**Client-side (components):**
```typescript
// ✅ Works
process.env.NEXT_PUBLIC_SHOPIFY_API_KEY
process.env.NEXT_PUBLIC_APP_URL

// ❌ Undefined
process.env.SHOPIFY_API_KEY
process.env.SUPABASE_URL
```

---

## 🧪 Debug Test

### Test 1: Add Debug Logging

**Temporarily add this to your AppBridgeProvider:**

```typescript
// In AppBridgeContent function, after line 25
console.log('[DEBUG] === Environment Variables Debug ===');
console.log('[DEBUG] NODE_ENV:', process.env.NODE_ENV);
console.log('[DEBUG] NEXT_PUBLIC_SHOPIFY_API_KEY:', process.env.NEXT_PUBLIC_SHOPIFY_API_KEY);
console.log('[DEBUG] NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
console.log('[DEBUG] All NEXT_PUBLIC vars:', Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')));
console.log('[DEBUG] === End Debug ===');
```

### Test 2: Check Vercel Logs

1. Go to: **Functions** tab in Vercel
2. Look for any environment variable errors
3. Check if the variable is being loaded

### Test 3: Manual Variable Check

**Create a test page to check variables:**

**File:** `src/app/test/env/page.tsx` (temporary)

```typescript
'use client';

export default function EnvTest() {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Environment Variables Test</h1>
      <p>NODE_ENV: {process.env.NODE_ENV}</p>
      <p>NEXT_PUBLIC_SHOPIFY_API_KEY: {process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || 'NOT SET'}</p>
      <p>NEXT_PUBLIC_APP_URL: {process.env.NEXT_PUBLIC_APP_URL || 'NOT SET'}</p>
      <p>All NEXT_PUBLIC vars: {JSON.stringify(Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')))}</p>
    </div>
  );
}
```

Visit: https://shopify-receptionist.vercel.app/test/env

---

## 🔧 Quick Fixes

### Fix 1: Double-Check Variable Name

In Vercel, make sure it's exactly:
```
NEXT_PUBLIC_SHOPIFY_API_KEY
```

### Fix 2: Set for All Environments

1. Edit the variable in Vercel
2. Check **Production**, **Preview**, and **Development**
3. Save

### Fix 3: Force Fresh Deploy

1. **Deployments** → Latest → **⋯** → **Redeploy**
2. **Uncheck** "Use existing Build Cache"
3. Wait for fresh build

### Fix 4: Check Variable Value

Make sure the value is exactly:
```
a0563782e38f84b7ce2ef0d2f5b87ed5
```

No extra spaces, quotes, or characters.

---

## 📊 Expected Results

### If Working Correctly:
```javascript
[DEBUG] NODE_ENV: production
[DEBUG] NEXT_PUBLIC_SHOPIFY_API_KEY: a0563782e38f84b7ce2ef0d2f5b87ed5
[DEBUG] NEXT_PUBLIC_APP_URL: https://shopify-receptionist.vercel.app
[DEBUG] All NEXT_PUBLIC vars: ['NEXT_PUBLIC_SHOPIFY_API_KEY', 'NEXT_PUBLIC_APP_URL']
```

### If Not Working:
```javascript
[DEBUG] NODE_ENV: production
[DEBUG] NEXT_PUBLIC_SHOPIFY_API_KEY: undefined
[DEBUG] NEXT_PUBLIC_APP_URL: https://shopify-receptionist.vercel.app
[DEBUG] All NEXT_PUBLIC vars: ['NEXT_PUBLIC_APP_URL']
```

---

## 🎯 Next Steps

1. **Add the debug logging** (temporarily)
2. **Check the console output**
3. **If undefined:** Check Vercel variable name/spelling
4. **If still undefined:** Force redeploy without cache
5. **Remove debug logging** once fixed

Let me know what the debug output shows!
