'use client';

import React, { type FC, type ReactNode, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { isProductionEnvironment } from '@/lib/utils/url';

interface AppBridgeProviderWrapperProps {
  children: ReactNode;
}

/**
 * App Bridge v4+ Implementation for Embedded Apps
 * Follows Shopify best practices for embedded app initialization
 */
function AppBridgeContent({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const [appBridgeReady, setAppBridgeReady] = useState(false);
  
  // Extract Shopify parameters from URL
  const host = searchParams.get('host');
  const shop = searchParams.get('shop');
  const embedded = searchParams.get('embedded');
  
  // Also try to get host from window.location as fallback
  const windowHost = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('host')
    : null;
  
  const finalHost = host || windowHost;
  
  // Check if we're in embedded context
  const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;
  const isEmbeddedParam = embedded === '1';
  const isActuallyEmbedded = isEmbedded || isEmbeddedParam;
  
  // Get API key from environment
  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
  
  // Simple logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log('[AppBridge] Initializing embedded app:', {
      shop: shop || 'not provided',
      host: finalHost ? 'present' : 'missing',
      apiKey: apiKey ? 'configured' : 'MISSING'
    });
  }
  
  // App Bridge handles cookie management automatically - no custom logic needed
  
  // Initialize App Bridge v4+ - SHOPIFY OFFICIAL PATTERN
  useEffect(() => {
    if (isActuallyEmbedded && finalHost && apiKey) {
      console.log('[AppBridge] Initializing with Shopify official pattern');
      
      // Dynamically import App Bridge to avoid SSR issues
      import('@shopify/app-bridge').then(({ createApp }) => {
        try {
          // Use Shopify's exact createApp pattern
          const app = createApp({
            apiKey: apiKey,
            host: finalHost,
            forceRedirect: false,
          });
          
          // Store app instance globally for use by other components
          if (typeof window !== 'undefined') {
            (window as any).shopifyApp = app;
          }
          
          setAppBridgeReady(true);
          console.log('[AppBridge] ✅ App Bridge initialized successfully');
        } catch (error) {
          console.error('[AppBridge] ❌ Failed to initialize App Bridge:', error);
        }
      }).catch((error) => {
        console.error('[AppBridge] ❌ Failed to import App Bridge:', error);
      });
    } else {
      if (process.env.NODE_ENV === 'development') {
        if (!isActuallyEmbedded) {
          console.log('[AppBridge] Running in standalone mode (not embedded)');
        } else if (!finalHost) {
          console.warn('[AppBridge] ⚠️ Embedded but missing host parameter');
        } else if (!apiKey) {
          console.error('[AppBridge] ❌ Missing NEXT_PUBLIC_SHOPIFY_API_KEY environment variable');
        }
      }
    }
  }, [isActuallyEmbedded, finalHost, apiKey]);
  
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
 * - Automatic cookie management (no custom logic needed)
 * 
 * Requirements:
 * - NEXT_PUBLIC_SHOPIFY_API_KEY must be set in environment variables
 * - host parameter must be in URL when embedded
 * 
 * Follows Shopify best practices for embedded apps
 */
export const AppBridgeProviderWrapper: FC<AppBridgeProviderWrapperProps> = ({ children }) => {
  return (
    <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>}>
      <AppBridgeContent>{children}</AppBridgeContent>
    </Suspense>
  );
};

export default AppBridgeProviderWrapper;
