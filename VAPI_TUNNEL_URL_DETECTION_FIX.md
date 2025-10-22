# ✅ Vapi Tunnel URL Detection - FIXED

## Problem

You were getting this error when provisioning:
```
Provisioning failed: Cannot provision Vapi with localhost URL (https://localhost:3000). 
Start Shopify CLI first: shopify app dev
```

**But Shopify CLI WAS running** - that's how you accessed the app!

---

## Root Cause

The issue was with **environment variable isolation**:

1. ✅ **Shopify CLI running** → Creates tunnel URL (e.g., `https://[random].trycloudflare.com`)
2. ✅ **Next.js running** → Your app server
3. ❌ **`SHOPIFY_APP_URL` not passed between processes** → Next.js doesn't see the tunnel URL
4. ❌ **Fallback to `NEXT_PUBLIC_APP_URL`** → Uses `localhost:3000`
5. ❌ **Validation blocks localhost** → Error message

**The problem:** Environment variables set by Shopify CLI in one terminal don't automatically propagate to Next.js running in another terminal.

---

## Solution Implemented

### **Auto-Detection from Browser**

The fix: **Detect the tunnel URL from the browser's current location** instead of relying on environment variables.

#### Changes Made:

### 1. **Frontend: Auto-Detect Tunnel URL** (`src/app/(authenticated)/test/vapi/page.tsx`)

```typescript
const provisionTestPhone = async () => {
  // NEW: Detect tunnel URL from browser location
  const currentOrigin = window.location.origin;
  const tunnelUrl = currentOrigin && !currentOrigin.includes('localhost') 
    ? currentOrigin 
    : undefined;
  
  console.log('[Vapi Test] Provisioning with:', {
    shop,
    tunnelUrl: tunnelUrl || 'Using environment variables',
  });

  // Pass detected tunnel URL to API
  const res = await fetch('/api/vapi/test/provision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      shop,
      tunnelUrl, // ← NEW: Pass tunnel URL
    }),
  });
};
```

**How it works:**
- When you access via `https://[tunnel].trycloudflare.com/test/vapi`
  - Browser sees: `window.location.origin = "https://[tunnel].trycloudflare.com"`
  - Detects: Not localhost → Use this as tunnel URL
  - Sends to API: `{ shop, tunnelUrl: "https://[tunnel].trycloudflare.com" }`

- When you access via `https://localhost:3000/test/vapi`
  - Browser sees: `window.location.origin = "https://localhost:3000"`
  - Detects: Is localhost → Don't use it
  - Sends to API: `{ shop, tunnelUrl: undefined }` → Falls back to env vars

### 2. **Backend: Accept Tunnel URL Parameter** (`src/app/api/vapi/test/provision/route.ts`)

```typescript
// NEW: Accept tunnelUrl from request body
const { shop, tunnelUrl } = await request.json();

// Use tunnel URL with priority: request → env var → fallback
const shopifyAppUrl = tunnelUrl || process.env.SHOPIFY_APP_URL;
const nextPublicUrl = process.env.NEXT_PUBLIC_APP_URL;

console.log('🔍 Environment Check:');
console.log('   Tunnel URL (from request):', tunnelUrl || 'NOT PROVIDED');
console.log('   SHOPIFY_APP_URL (env):', process.env.SHOPIFY_APP_URL || 'NOT SET');
console.log('   NEXT_PUBLIC_APP_URL (env):', nextPublicUrl || 'NOT SET');
console.log('   Using:', shopifyAppUrl || nextPublicUrl);
```

**Priority order:**
1. **`tunnelUrl`** (from request body) ← **NEW**
2. `process.env.SHOPIFY_APP_URL` (from env var)
3. `process.env.NEXT_PUBLIC_APP_URL` (from `.env` file)

### 3. **Improved Error Messages**

If localhost is still detected, you now get clear guidance:

```
❌ ERROR: Cannot use localhost URL for Vapi
Current URL: https://localhost:3000

🔧 PROBLEM: You're accessing the app via localhost in your browser
   This means the tunnel URL isn't being detected

💡 SOLUTION: Access the app via the Shopify Admin
   1. Ensure Shopify CLI is running: shopify app dev
   2. Click "Preview" link in Shopify CLI output
   3. Or access via: https://[your-shop].myshopify.com/admin/apps

When accessed via Shopify Admin, the tunnel URL is auto-detected.
```

---

## How to Use

### ✅ **Correct Way (What You Should Do)**

1. **Start Shopify CLI:**
   ```powershell
   shopify app dev
   ```

2. **Start Next.js (separate terminal):**
   ```powershell
   npm run dev
   ```

3. **Access via Shopify Admin:**
   - Click the **"Preview"** link in Shopify CLI output
   - Or go to: `https://always-ai-dev-store.myshopify.com/admin/apps`
   - Navigate to `/test/vapi` within the app

4. **Click "Provision Test Phone Number"**

5. **Check terminal logs:**
   ```
   🔍 Environment Check:
      Tunnel URL (from request): https://[something].trycloudflare.com  ← Detected!
      SHOPIFY_APP_URL (env): NOT SET
      NEXT_PUBLIC_APP_URL (env): https://localhost:3000
      Using: https://[something].trycloudflare.com  ← Success!
   ✅ Public URL validated: https://[something].trycloudflare.com/api/vapi/functions
   ```

---

### ❌ **What Won't Work (Localhost Access)**

If you access via `https://localhost:3000/test/vapi`:

```
🔍 Environment Check:
   Tunnel URL (from request): NOT PROVIDED  ← Browser saw localhost
   SHOPIFY_APP_URL (env): NOT SET
   NEXT_PUBLIC_APP_URL (env): https://localhost:3000
   Using: https://localhost:3000  ← Blocked!

❌ ERROR: Cannot use localhost URL for Vapi
```

---

## Why This Matters

**During a phone call:**

```
Customer calls Vapi phone number
         ↓
Vapi needs to call YOUR app's /api/vapi/functions
         ↓
YOUR app fetches Shopify product data
         ↓
YOUR app returns data to Vapi
         ↓
Vapi speaks response to customer
```

**If URL is `localhost:3000`:**
- ❌ Vapi's servers (on the internet) try to reach `localhost:3000`
- ❌ `localhost` means "this computer" (Vapi's server, not yours)
- ❌ Connection fails
- ❌ Customer hears nothing or error

**If URL is tunnel (e.g., `https://[tunnel].trycloudflare.com`):**
- ✅ Vapi reaches Cloudflare tunnel (public internet)
- ✅ Tunnel forwards to your `localhost:3000`
- ✅ Your app processes request
- ✅ Returns data to Vapi
- ✅ Customer gets answer

---

## Debugging

### Check What URL Is Being Used

Look at browser console when clicking "Provision":
```javascript
[Vapi Test] Provisioning with: {
  shop: "always-ai-dev-store.myshopify.com",
  tunnelUrl: "https://[something].trycloudflare.com"  // ← Should see tunnel URL
}
```

Look at terminal logs during provisioning:
```
🔍 Environment Check:
   Tunnel URL (from request): https://[something].trycloudflare.com  // ← Should see tunnel URL
   Using: https://[something].trycloudflare.com  // ← Should NOT be localhost
```

---

## Files Changed

1. **`src/app/(authenticated)/test/vapi/page.tsx`** (lines 94-112)
   - Added tunnel URL detection from `window.location.origin`
   - Passes `tunnelUrl` to API

2. **`src/app/api/vapi/test/provision/route.ts`** (lines 14, 27-35, 50-59)
   - Accepts `tunnelUrl` from request body
   - Prioritizes request tunnel URL over env vars
   - Improved logging and error messages

---

## Summary

| Before | After |
|--------|-------|
| ❌ Relied only on env vars | ✅ Auto-detects from browser |
| ❌ Env vars not passed between terminals | ✅ Tunnel URL detected directly |
| ❌ Confusing error when CLI running | ✅ Clear instructions |
| ❌ Manual env var setup needed | ✅ Works automatically via Shopify Admin |

**Key Insight:** When you access the app via Shopify Admin, you're **already using the tunnel URL** in your browser. We now detect and use that URL automatically!

---

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Tunnel URL (from request): NOT PROVIDED" | Access via Shopify Admin, not localhost |
| "Using: https://localhost:3000" | Click Preview in Shopify CLI output |
| Provisioning still fails | Check browser console for detected URL |
| Want to test without Shopify Admin | Manually set `$env:SHOPIFY_APP_URL` before `npm run dev` |

---

## Testing

1. ✅ Access via Shopify Admin → Should work automatically
2. ✅ Check logs → Should show tunnel URL detected
3. ✅ Provisioning succeeds → Assistant created with public URL
4. ❌ Access via localhost → Clear error with instructions

**Status: FIXED** ✅

The tunnel URL is now automatically detected from your browser location, eliminating the environment variable propagation issue between Shopify CLI and Next.js processes.

