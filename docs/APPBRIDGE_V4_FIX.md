# App Bridge v4+ Fix - Complete Solution

## 🚨 Problem Identified

**Error:** `'Provider' is not exported from '@shopify/app-bridge-react'`

**Root Cause:** App Bridge v4+ removed the `Provider` and `AppProvider` exports. The app is using `@shopify/app-bridge-react` version `^4.2.7`, which is v4+.

## 📊 Current Package Versions

```json
{
  "@shopify/app-bridge-react": "^4.2.7",  // v4+ - Provider removed
  "@shopify/polaris": "^13.9.5",          // Compatible with v4+
  "@shopify/shopify-api": "^12.0.0"       // Compatible with v4+
}
```

## 🔧 Solution: App Bridge v4+ Pattern

### What Changed in v4+

**v3 (OLD):**
```typescript
import { Provider } from '@shopify/app-bridge-react';

<Provider config={{ apiKey, host }}>
  {children}
</Provider>
```

**v4+ (NEW):**
```typescript
import { createApp } from '@shopify/app-bridge';

const app = createApp({ apiKey, host });
// No Provider wrapper needed
```

### Complete Fixed Implementation

**File:** `src/components/providers/AppBridgeProvider.tsx`

```typescript
'use client';

import React, { type FC, type ReactNode, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface AppBridgeProviderWrapperProps {
  children: ReactNode;
}

/**
 * App Bridge v4+ Implementation
 * Uses the new createApp pattern instead of Provider/AppProvider
 */
function AppBridgeContent({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const [appBridgeInitialized, setAppBridgeInitialized] = useState(false);
  
  // Extract Shopify parameters from URL
  const host = searchParams.get('host');
  const shop = searchParams.get('shop');
  
  // Also try to get host from window.location as fallback
  const windowHost = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('host')
    : null;
  
  const finalHost = host || windowHost;
  
  // Check if we're in embedded context
  const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;
  
  // Get API key from environment
  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
  
  // Initialize App Bridge v4+ using createApp pattern
  useEffect(() => {
    if (isEmbedded && finalHost && apiKey) {
      console.log('[AppBridge] Initializing App Bridge v4+ with createApp pattern');
      
      // Dynamically import App Bridge to avoid SSR issues
      import('@shopify/app-bridge').then(({ createApp }) => {
        try {
          const app = createApp({
            apiKey: apiKey,
            host: finalHost,
            forceRedirect: false,
          });
          
          // Store app instance globally for use by other components
          if (typeof window !== 'undefined') {
            (window as any).shopifyApp = app;
          }
          
          setAppBridgeInitialized(true);
          console.log('[AppBridge] ✅ App Bridge v4+ initialized successfully');
        } catch (error) {
          console.error('[AppBridge] ❌ Failed to initialize App Bridge:', error);
        }
      }).catch((error) => {
        console.error('[AppBridge] ❌ Failed to import App Bridge:', error);
      });
    } else {
      // Log why App Bridge wasn't initialized
      if (process.env.NODE_ENV === 'development') {
        if (!isEmbedded) {
          console.log('[AppBridge] Running in standalone mode (not embedded)');
        } else if (!finalHost) {
          console.warn('[AppBridge] ⚠️ Embedded but missing host parameter');
        } else if (!apiKey) {
          console.error('[AppBridge] ❌ Missing NEXT_PUBLIC_SHOPIFY_API_KEY environment variable');
        }
      }
    }
  }, [isEmbedded, finalHost, apiKey]);
  
  return <>{children}</>;
}

/**
 * App Bridge Provider Wrapper
 * Initializes Shopify App Bridge for embedded app communication
 * 
 * This enables:
 * - Proper iframe embedding in Shopify Admin
 * - Session token authentication
 * - App Bridge features (navigation, toasts, etc.)
 * 
 * Requirements:
 * - NEXT_PUBLIC_SHOPIFY_API_KEY must be set in environment variables
 * - host parameter must be in URL when embedded
 */
export const AppBridgeProviderWrapper: FC<AppBridgeProviderWrapperProps> = ({ children }) => {
  return (
    <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>}>
      <AppBridgeContent>{children}</AppBridgeContent>
    </Suspense>
  );
};

export default AppBridgeProviderWrapper;
```

## 📦 Package Changes

### Added Package:
```bash
npm install @shopify/app-bridge
```

**Why:** The v4+ pattern uses `createApp` from the core `@shopify/app-bridge` package, not the React wrapper.

### Package Structure:
- `@shopify/app-bridge` - Core App Bridge functionality (createApp)
- `@shopify/app-bridge-react` - React hooks and utilities (v4+ compatible)
- `@shopify/polaris` - UI components (compatible with v4+)

## 🔄 Migration from v3 to v4+

### Key Changes:

1. **No Provider Wrapper:**
   ```typescript
   // v3 (OLD)
   <Provider config={{ apiKey, host }}>
     {children}
   </Provider>
   
   // v4+ (NEW)
   const app = createApp({ apiKey, host });
   // No wrapper needed
   ```

2. **Dynamic Import:**
   ```typescript
   // v4+ uses dynamic import to avoid SSR issues
   import('@shopify/app-bridge').then(({ createApp }) => {
     const app = createApp({ apiKey, host });
   });
   ```

3. **Global App Instance:**
   ```typescript
   // Store app globally for use by other components
   (window as any).shopifyApp = app;
   ```

4. **No Context Provider:**
   - v3 used React Context
   - v4+ uses global window object
   - Components access via `window.shopifyApp`

## 🧪 Testing the Fix

### Expected Console Output (Shopify Admin):

```javascript
[AppBridge] Initializing App Bridge v4+ with createApp pattern
[AppBridge] ✅ App Bridge v4+ initialized successfully
```

### Expected Console Output (Direct Access):

```javascript
[AppBridge] Running in standalone mode (not embedded)
```

### No More Errors:
- ❌ `'Provider' is not exported from '@shopify/app-bridge-react'`
- ❌ `'AppProvider' is not exported from '@shopify/app-bridge-react'`

## 🔧 Using App Bridge in Components

### Accessing App Bridge Instance:

```typescript
// In any component
const app = (window as any).shopifyApp;

if (app) {
  // Use App Bridge features
  app.dispatch(Toast.show('Hello from App Bridge!'));
}
```

### App Bridge Hooks (if needed):

```typescript
import { useAppBridge } from '@shopify/app-bridge-react';

function MyComponent() {
  const app = useAppBridge();
  
  if (app) {
    // Use App Bridge features
  }
}
```

## 📊 Version Compatibility

| Package | Version | Status |
|---------|---------|--------|
| `@shopify/app-bridge` | `^4.0.0` | ✅ Added |
| `@shopify/app-bridge-react` | `^4.2.7` | ✅ Compatible |
| `@shopify/polaris` | `^13.9.5` | ✅ Compatible |
| `@shopify/shopify-api` | `^12.0.0` | ✅ Compatible |

## 🎯 Benefits of v4+ Pattern

1. **No SSR Issues:** Dynamic import prevents server-side rendering problems
2. **Better Performance:** No React Context overhead
3. **Simpler API:** Direct `createApp` call
4. **Future-Proof:** Latest App Bridge pattern
5. **Global Access:** App instance available everywhere

## ✅ Verification Checklist

### Code Changes:
- [x] ✅ Removed `Provider` import from `@shopify/app-bridge-react`
- [x] ✅ Added `createApp` pattern with dynamic import
- [x] ✅ Added `@shopify/app-bridge` package
- [x] ✅ Global app instance storage
- [x] ✅ Enhanced error handling and logging

### Environment Setup:
- [ ] ⏳ Add `NEXT_PUBLIC_SHOPIFY_API_KEY` to Vercel
- [ ] ⏳ Redeploy without build cache
- [ ] ⏳ Test through Shopify Admin

### Expected Results:
- [ ] ✅ No import errors
- [ ] ✅ App Bridge v4+ initializes successfully
- [ ] ✅ App works embedded in Shopify Admin
- [ ] ✅ No Provider/AppProvider errors

## 🚀 Next Steps

1. **Deploy the fix** (already done in code)
2. **Add environment variable to Vercel:**
   ```bash
   NEXT_PUBLIC_SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5
   ```
3. **Redeploy without build cache**
4. **Test through Shopify Admin** (not direct URL)

**The App Bridge v4+ implementation is complete and ready for deployment!** 🎉
