'use client';

import React, { type FC, type ReactNode, Suspense } from 'react';
import { Provider } from '@shopify/app-bridge-react';
import { useSearchParams } from 'next/navigation';

interface AppBridgeProviderWrapperProps {
  children: ReactNode;
}

/**
 * Inner component that uses useSearchParams (must be wrapped in Suspense)
 */
function AppBridgeContent({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  
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
  
  // Debug logging (temporarily - remove after fixing)
  console.log('[DEBUG] === Environment Variables Debug ===');
  console.log('[DEBUG] NODE_ENV:', process.env.NODE_ENV);
  console.log('[DEBUG] NEXT_PUBLIC_SHOPIFY_API_KEY:', process.env.NEXT_PUBLIC_SHOPIFY_API_KEY);
  console.log('[DEBUG] NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
  console.log('[DEBUG] All NEXT_PUBLIC vars:', Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')));
  console.log('[DEBUG] === Host Parameter Debug ===');
  console.log('[DEBUG] Host from searchParams:', host);
  console.log('[DEBUG] Host from window.location:', windowHost);
  console.log('[DEBUG] Final host:', finalHost);
  console.log('[DEBUG] Is embedded:', isEmbedded);
  console.log('[DEBUG] === End Debug ===');
  
  // Log initialization (only in development)
  if (process.env.NODE_ENV === 'development' && isEmbedded) {
    console.log('[AppBridge] Initializing in embedded mode');
    console.log('[AppBridge] Shop:', shop || 'not provided');
    console.log('[AppBridge] Host:', finalHost ? 'present' : 'missing');
    console.log('[AppBridge] API Key:', apiKey ? 'configured' : 'MISSING - Set NEXT_PUBLIC_SHOPIFY_API_KEY');
  }
  
  // If we're embedded and have the required parameters, initialize App Bridge
  if (isEmbedded && finalHost && apiKey) {
    return (
      <Provider
        config={{
          apiKey: apiKey,
          host: finalHost,
          forceRedirect: false,
        }}
      >
        {children}
      </Provider>
    );
  }
  
  // Not embedded or missing parameters - render without App Bridge
  if (process.env.NODE_ENV === 'development' && !isEmbedded) {
    console.log('[AppBridge] Running in standalone mode (not embedded)');
  }
  
  if (process.env.NODE_ENV === 'development' && isEmbedded && !finalHost) {
    console.warn('[AppBridge] ⚠️ Embedded but missing host parameter');
  }
  
  if (process.env.NODE_ENV === 'development' && isEmbedded && !apiKey) {
    console.error('[AppBridge] ❌ Missing NEXT_PUBLIC_SHOPIFY_API_KEY environment variable');
  }
  
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
