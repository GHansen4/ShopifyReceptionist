# OAuth Flow Initiation - Complete Guide

## Problem Fixed

```
❌ Visiting https://lan-lexmark-reed-tile.trycloudflare.com/ doesn't redirect to Shopify OAuth
❌ No OAuth flow is initiated
❌ Need to manually access /api/auth?shop=... to start
```

The root page wasn't checking for a `shop` query parameter to initiate the OAuth flow.

---

## Solution: Root Page OAuth Detection

The home page (`src/app/page.tsx`) now automatically detects the `shop` parameter and initiates OAuth.

### **How It Works**

```
Step 1: User visits with shop parameter
  URL: https://lan-lexmark-reed-tile.trycloudflare.com/?shop=always-on-apps.myshopify.com
  
Step 2: Root page detects shop parameter (useSearchParams)
  
Step 3: useEffect hook triggers
  if (shop) {
    window.location.href = `/api/auth?shop=${encodeURIComponent(shop)}`;
  }
  
Step 4: Redirects to /api/auth
  
Step 5: /api/auth generates OAuth nonce and URL
  
Step 6: Redirects to Shopify OAuth
  URL: https://always-on-apps.myshopify.com/admin/oauth/authorize?...
  
Step 7: User authorizes in Shopify
  
Step 8: Shopify redirects back to callback
  URL: https://lan-lexmark-reed-tile.trycloudflare.com/api/auth/callback?code=...
  
Step 9: Callback validates and saves shop
  
Step 10: Redirects to dashboard (authenticated)
```

---

## Complete OAuth Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ User Starts Installation                                        │
│ (Clicks "Install" in Shopify Partner Dashboard)                │
│ Redirects to: /?shop=always-on-apps.myshopify.com              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Root Page (src/app/page.tsx)                            │
├─────────────────────────────────────────────────────────────────┤
│ useSearchParams() → get shop parameter                          │
│ useEffect() → detect shop parameter                             │
│ window.location.href = `/api/auth?shop=...`                    │
│ Show: "Redirecting to Shopify for authentication..."           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Auth Route (src/app/api/auth/route.ts)                  │
├─────────────────────────────────────────────────────────────────┤
│ 1. Get shop parameter from query                               │
│ 2. Validate shop domain format                                  │
│ 3. Generate random nonce (state parameter)                      │
│ 4. Store nonce in state manager (in-memory + TTL)              │
│ 5. Also set nonce in secure cookie (backup)                    │
│ 6. Build authorization URL:                                     │
│    https://{shop}/admin/oauth/authorize?                        │
│      client_id={API_KEY}&                                       │
│      scope={SCOPES}&                                             │
│      redirect_uri={CALLBACK_URL}&                               │
│      state={NONCE}                                               │
│ 7. Redirect to authorization URL                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Shopify OAuth Authorization                             │
├─────────────────────────────────────────────────────────────────┤
│ User sees Shopify consent screen                                │
│ User clicks "Install" to authorize scopes:                      │
│   - read_customers                                               │
│   - read_orders                                                  │
│   - read_products                                                │
│                                                                  │
│ Shopify generates authorization code (expires ~10 min)          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: Shopify Redirects Back                                  │
├─────────────────────────────────────────────────────────────────┤
│ Shopify redirects to callback with:                             │
│   https://.../api/auth/callback?                                │
│     code={AUTHORIZATION_CODE}&                                  │
│     hmac={SHOPIFY_HMAC}&                                        │
│     shop={SHOP}&                                                 │
│     state={NONCE}&                                               │
│     timestamp={TS}&                                              │
│     host={HOST}                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: Callback Route (src/app/api/auth/callback/route.ts)     │
├─────────────────────────────────────────────────────────────────┤
│ 1. Extract query parameters                                     │
│ 2. Validate state/nonce:                                        │
│    - Try state manager (primary)                                │
│    - Try cookie (fallback)                                      │
│    - Verify nonce === state                                     │
│ 3. Validate HMAC signature                                      │
│ 4. Exchange authorization code for access token:                │
│    POST https://{shop}/admin/oauth/access_token                │
│    {client_id, client_secret, code}                            │
│ 5. Save shop to database:                                       │
│    - shop_domain                                                 │
│    - access_token                                                │
│    - subscription_status = 'trial'                              │
│ 6. Set session cookie (authenticated)                           │
│ 7. Delete nonce from state manager                              │
│ 8. Redirect to dashboard                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 6: Authenticated Session                                   │
├─────────────────────────────────────────────────────────────────┤
│ User is logged in and authenticated                             │
│ Can access protected routes:                                     │
│   - /calls                                                       │
│   - /dashboard                                                   │
│   - /settings                                                    │
│ Session cookie: shopify_session={shop_id}                       │
│ Session expires: 30 days                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Code Changes

### **1. Root Page Updated** ✅

**File: `src/app/page.tsx`**

```typescript
'use client';

import React, { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Box, Card, Text, Layout, Page as PolarisPage } from '@shopify/polaris';

export default function Home() {
  const searchParams = useSearchParams();
  const shop = searchParams.get('shop');

  useEffect(() => {
    // If shop parameter is provided, initiate OAuth flow
    if (shop) {
      // Redirect to OAuth endpoint which will redirect to Shopify
      window.location.href = `/api/auth?shop=${encodeURIComponent(shop)}`;
    }
  }, [shop]);

  // Show loading state while redirecting
  if (shop) {
    return (
      <PolarisPage title="Voice Receptionist">
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="400">
                <Text variant="bodyMd" as="p">
                  Redirecting to Shopify for authentication...
                </Text>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </PolarisPage>
    );
  }

  // Show welcome dashboard if no shop parameter
  return (
    // ... dashboard UI ...
  );
}
```

**Key Points:**
- ✅ Uses `useSearchParams()` hook (from Next.js)
- ✅ Gets `shop` parameter from URL
- ✅ Uses `useEffect()` to trigger redirect
- ✅ Shows loading message while redirecting
- ✅ Falls back to dashboard if no shop parameter

---

## Testing the OAuth Flow

### **Test 1: Automatic Redirect with Shop Parameter**

1. **Visit URL with shop parameter:**
   ```
   https://lan-lexmark-reed-tile.trycloudflare.com/?shop=always-on-apps.myshopify.com
   ```

2. **Expected behavior:**
   - ✅ Page shows: "Redirecting to Shopify for authentication..."
   - ✅ Redirects to `/api/auth?shop=always-on-apps.myshopify.com`
   - ✅ Redirects to Shopify OAuth URL
   - ✅ Lands on Shopify consent screen

3. **Console output:**
   ```
   [OAuth Init] Starting OAuth flow for shop: always-on-apps.myshopify.com
   [OAuth Init] Generated nonce: [hash]...
   [OAuth Init] Authorization URL generated
   [StateManager] Stored nonce for shop: always-on-apps.myshopify.com
   [OAuth Init] ✅ Nonce stored in state manager
   [OAuth Init] ✅ Cookies set (backup mechanism)
   ```

### **Test 2: Dashboard Without Shop Parameter**

1. **Visit root URL:**
   ```
   https://lan-lexmark-reed-tile.trycloudflare.com/
   ```

2. **Expected behavior:**
   - ✅ Shows welcome dashboard
   - ✅ No redirect happens
   - ✅ No "Redirecting..." message

### **Test 3: Complete Flow**

1. **Start:** `https://lan-lexmark-reed-tile.trycloudflare.com/?shop=always-on-apps.myshopify.com`
2. **Authorize in Shopify**
3. **Check console for:**
   ```
   [Callback] ✅ OAuth state validation PASSED
   [Callback] Token exchange successful
   [Callback] Shop upserted successfully
   [Callback] Cleaned up OAuth state for shop
   ```
4. **You should be redirected to dashboard** ✅

---

## URL Structure

### **OAuth Initiation URL**

```
https://lan-lexmark-reed-tile.trycloudflare.com/?shop=always-on-apps.myshopify.com
│                                                     │
└── Root page with shop parameter ──────────────────┘
                                   │
                                   ↓
                         Triggers useEffect()
                                   │
                                   ↓
                   Redirects to /api/auth?shop=...
```

### **Authorization URL (Built by /api/auth)**

```
https://always-on-apps.myshopify.com/admin/oauth/authorize?
  client_id=a0563782e38f84b7ce2ef0d2f5b87ed5&
  scope=read_customers,read_orders,read_products&
  redirect_uri=https://lan-lexmark-reed-tile.trycloudflare.com/api/auth/callback&
  state=af86670a594f66b636462bc7ebc84305f06086f4fad9317d289d27184b13f3ee
```

### **Callback URL (Shopify Redirects Here)**

```
https://lan-lexmark-reed-tile.trycloudflare.com/api/auth/callback?
  code=40cbe03761959d2b91b4b23d665799ef&
  hmac=f5eec8750d6740a56499ac26c4128fbd3613abb0342e1f2854ff23c7f3aad004&
  shop=always-on-apps.myshopify.com&
  state=af86670a594f66b636462bc7ebc84305f06086f4fad9317d289d27184b13f3ee&
  timestamp=1761011255&
  host=YWRtaW4uc2hvcGlmeS5jb20vc3RvcmUvYWx3YXlzLW9uLWFwcHM
```

---

## Why This Works

| Component | Purpose |
|-----------|---------|
| **Root Page** | Detects `shop` parameter and initiates flow |
| **useSearchParams()** | Reads query parameters from URL |
| **useEffect()** | Triggers redirect when shop is detected |
| **window.location.href** | Performs redirect (browser-native, reliable) |
| **/api/auth** | Handles OAuth initialization, generates nonce |
| **State Manager** | Stores nonce for callback validation |
| **Cookies** | Backup storage for nonce (survives server restart) |
| **/api/auth/callback** | Handles Shopify redirect, validates, saves shop |

---

## Security Features

✅ **Nonce/State Validation**
- Prevents CSRF attacks
- OAuth state must match stored nonce
- Single-use (deleted after validation)

✅ **HMAC Signature Validation**
- Verifies request comes from Shopify
- Uses timing-safe comparison
- Protects against tampering

✅ **Secure Cookies**
- httpOnly (can't access from JavaScript)
- secure (only over HTTPS in production)
- sameSite=lax (CSRF protection)
- Auto-expires after 10 minutes

✅ **Single-Use Authorization Code**
- Code expires after ~10 minutes
- Can only be used once
- Prevents reuse attacks

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Blank page | useSearchParams() not imported | ✅ Fixed |
| No redirect | shop parameter missing | Add `?shop=...` to URL |
| Redirect loops | useEffect() not checking shop | ✅ Fixed with condition |
| CORS error | Cloudflare config issue | Check allowedDevOrigins |
| State not found | Server restarted | Cookie fallback handles it |

---

## Environment Variables Used

| Variable | Example | Used In |
|----------|---------|---------|
| `NEXT_PUBLIC_APP_URL` | `https://lan-lexmark-reed-tile.trycloudflare.com` | Auth route (redirect_uri) |
| `SHOPIFY_API_KEY` | `a0563782e38f84b7ce2ef0d2f5b87ed5` | Auth route (client_id) |
| `SHOPIFY_API_SECRET` | `shpss_...` | Callback (token exchange) |
| `SHOPIFY_SCOPES` | `read_customers,read_orders,read_products` | Auth route (scope) |
| `NODE_ENV` | `development` | Logging |

---

## Next Steps

1. ✅ **Root page updated** with OAuth detection
2. ✅ **Shopify config updated** (`shopify.app.toml`)
3. **Restart dev server** to load new code
4. **Test OAuth flow** with new tunnel URL
5. **Complete the Shopify authorization**
6. **Verify you're authenticated** (redirected to dashboard)

**OAuth flow initiation is now AUTOMATIC! 🚀**

