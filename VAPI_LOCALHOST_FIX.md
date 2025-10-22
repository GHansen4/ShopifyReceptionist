# ✅ Vapi Localhost URL Issue - FIXED

## Problem

When provisioning a Vapi phone number, you received this error:

```
serverUrl must be a valid URL. Hot tip, the protocol should be https://, 
but found https://localhost:3000/api/vapi/functions
```

**Root Cause:** Vapi needs a **publicly accessible URL** to call your app's functions during phone calls. `localhost:3000` is only accessible from your computer, not from Vapi's servers.

---

## Solution Implemented

### 1. **Pre-Flight Validation Added**

The code now **checks the URL BEFORE** creating the assistant:

```typescript
// src/app/api/vapi/test/provision/route.ts (lines 23-62)

// PRE-FLIGHT CHECK: Validate Public URL
const shopifyAppUrl = process.env.SHOPIFY_APP_URL;
const nextPublicUrl = process.env.NEXT_PUBLIC_APP_URL;

// Log what URLs are available
console.log('SHOPIFY_APP_URL:', shopifyAppUrl || 'NOT SET');
console.log('NEXT_PUBLIC_APP_URL:', nextPublicUrl || 'NOT SET');

// Use Shopify tunnel URL if available, fallback to NEXT_PUBLIC_APP_URL
const serverBaseUrl = shopifyAppUrl || nextPublicUrl;

// CRITICAL: Reject localhost URLs
if (serverBaseUrl.includes('localhost') || serverBaseUrl.includes('127.0.0.1')) {
  console.error('❌ ERROR: Cannot use localhost URL for Vapi');
  console.error('Current URL:', serverBaseUrl);
  console.error('');
  console.error('🔧 FIX: Start Shopify CLI to get a public tunnel URL');
  console.error('   1. Terminal 1: shopify app dev');
  console.error('   2. Terminal 2: npm run dev');
  
  return error; // Stops provisioning immediately
}

const functionUrl = `${serverBaseUrl}/api/vapi/functions`;
console.log('✅ Public URL validated:', functionUrl);
```

### 2. **Clear Error Messages**

If localhost is detected, you'll now see:

```
❌ ERROR: Cannot provision Vapi with localhost URL (https://localhost:3000)
   Start Shopify CLI first: shopify app dev

Shopify CLI creates a public tunnel (*.trycloudflare.com) that Vapi can reach.
```

---

## How to Use

### ✅ **Correct Setup (2 Terminals)**

**Terminal 1 - Shopify CLI (MUST run first):**
```powershell
shopify app dev
```

Wait for:
```
✅ Ready, watching for changes in your app
```

This creates a public tunnel URL like:
```
https://santa-jenny-frequencies-replacement.trycloudflare.com
```

**Terminal 2 - Next.js:**
```powershell
npm run dev
```

### ❌ **What Won't Work**

Running only `npm run dev` without `shopify app dev` will result in:
- `SHOPIFY_APP_URL`: NOT SET
- Fallback to `NEXT_PUBLIC_APP_URL`: `https://localhost:3000`
- **Provisioning BLOCKED** with error message

---

## Environment Variable Priority

The code checks environment variables in this order:

1. **`SHOPIFY_APP_URL`** (preferred) - Set automatically by Shopify CLI
   - Example: `https://[random].trycloudflare.com`
   - ✅ Public - Vapi can reach it

2. **`NEXT_PUBLIC_APP_URL`** (fallback) - Set in your `.env`
   - Example: `https://localhost:3000`
   - ❌ Private - Vapi cannot reach it

---

## What Changed

### Before:
```typescript
// Would try to use localhost and fail at Vapi API level
serverUrl: `${process.env.SHOPIFY_APP_URL || process.env.NEXT_PUBLIC_APP_URL}/api/vapi/functions`
```

### After:
```typescript
// Validates URL BEFORE calling Vapi API
const serverBaseUrl = process.env.SHOPIFY_APP_URL || process.env.NEXT_PUBLIC_APP_URL;

if (serverBaseUrl.includes('localhost')) {
  return error; // Stop immediately with clear message
}

serverUrl: `${serverBaseUrl}/api/vapi/functions` // Only proceeds if public URL
```

---

## Testing the Fix

1. **Start servers in correct order:**
   ```powershell
   # Terminal 1
   shopify app dev
   
   # Terminal 2 (wait for tunnel URL to appear)
   npm run dev
   ```

2. **Go to Vapi test page:**
   ```
   https://localhost:3000/test/vapi?shop=always-ai-dev-store.myshopify.com
   ```

3. **Click "Provision Test Phone Number"**

4. **Check terminal logs** - you should see:
   ```
   🔍 Environment Check:
      SHOPIFY_APP_URL: https://[something].trycloudflare.com
      NEXT_PUBLIC_APP_URL: https://localhost:3000
   ✅ Public URL validated: https://[something].trycloudflare.com/api/vapi/functions
   ✅ Assistant created: ast_...
   ```

5. **If you see an error**, the logs will tell you exactly what's wrong:
   - Which URL it's trying to use
   - Why it's rejecting it
   - How to fix it (start Shopify CLI)

---

## Files Changed

- `src/app/api/vapi/test/provision/route.ts` (lines 23-62)
  - Added pre-flight URL validation
  - Added detailed logging
  - Blocks provisioning if localhost detected
  - Provides clear error messages

---

## Why This Matters

**During a phone call:**
```
1. Customer calls → Vapi servers answer
2. Customer asks "What do you sell?"
3. Vapi needs to call YOUR app's function endpoint
4. YOUR app fetches products from Shopify
5. YOUR app returns data to Vapi
6. Vapi speaks the response to the customer
```

If your URL is `localhost:3000`, **step 3 fails** because:
- Vapi's servers are on the internet
- `localhost` only means "this computer"
- Vapi can't reach "your computer"

With Shopify CLI's tunnel:
```
https://[random].trycloudflare.com/api/vapi/functions
         ↓
    (public internet - Vapi can reach it)
         ↓
    Cloudflare tunnel
         ↓
    Your local server (localhost:3000)
```

---

## Quick Reference

| Scenario | SHOPIFY_APP_URL | Provisioning Result |
|----------|----------------|---------------------|
| Only `npm run dev` | NOT SET | ❌ Blocked (localhost) |
| `shopify app dev` + `npm run dev` | `https://[tunnel].trycloudflare.com` | ✅ Success |
| Stopped `shopify app dev` | May be stale | ⚠️ May fail (old tunnel) |

---

## Troubleshooting

### "SHOPIFY_APP_URL: NOT SET"

**Cause:** Shopify CLI is not running.

**Fix:**
```powershell
shopify app dev
```

### "Using localhost URL"

**Cause:** `SHOPIFY_APP_URL` is undefined, falling back to `.env` file.

**Fix:** Start Shopify CLI before Next.js:
```powershell
# Stop current servers (Ctrl+C in both terminals)
# Then restart in correct order:
shopify app dev    # Wait for tunnel
npm run dev        # Then start Next.js
```

### "Tunnel URL changes every time"

**Cause:** Shopify CLI generates a new random tunnel URL each time you restart.

**Impact:** 
- ✅ No problem for development
- ✅ Next provision will use the new URL automatically
- ⚠️ Old assistants still have the old URL (won't work until re-provisioned)

**Solution:** Re-provision after restarting Shopify CLI if needed.

---

## Summary

✅ **Problem solved:** Code now validates URLs before calling Vapi API
✅ **Clear errors:** You'll know immediately if localhost is being used
✅ **Auto-detection:** Uses tunnel URL when available
✅ **Safe fallback:** Blocks provisioning if only localhost is available

