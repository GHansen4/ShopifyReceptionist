'use client';

import React, { type FC, type ReactNode, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface AppBridgeProviderWrapperProps {
  children: ReactNode;
}

/**
 * App Bridge Provider Wrapper
 * Initializes Shopify App Bridge for embedded app communication
 * This enables the app to work properly when embedded in Shopify Admin
 * 
 * For Next.js App Router embedded apps, we:
 * 1. Extract session parameters from URL (host, shop, id_token)
 * 2. Use these to communicate with Shopify Admin
 * 3. Enable App Bridge features (navigation, toasts, etc.)
 */
export const AppBridgeProviderWrapper: FC<AppBridgeProviderWrapperProps> = ({ children }) => {
  const searchParams = useSearchParams();
  const [isInitialized, setIsInitialized] = useState(false);
  const [config, setConfig] = useState<{
    host?: string;
    shop?: string;
    apiKey?: string;
  } | null>(null);

  useEffect(() => {
    // Initialize App Bridge on client side
    const initializeAppBridge = async () => {
      try {
        // Extract Shopify parameters from URL
        const host = searchParams.get('host');
        const shop = searchParams.get('shop');
        const embedded = searchParams.get('embedded');
        const idToken = searchParams.get('id_token');
        const session = searchParams.get('session');
        
        // Check if we're in embedded context
        const isEmbedded = embedded === '1' || window.self !== window.top;
        
        if (isEmbedded && (host || shop)) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[AppBridge] Initializing in embedded mode');
            console.log('[AppBridge] Shop:', shop);
            console.log('[AppBridge] Host:', host ? 'present' : 'missing');
            console.log('[AppBridge] ID Token:', idToken ? 'present' : 'missing');
            console.log('[AppBridge] Session:', session ? 'present' : 'missing');
          }
          
          setConfig({
            host: host || undefined,
            shop: shop || undefined,
            apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
          });
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('[AppBridge] Running in standalone mode (not embedded)');
          }
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('[AppBridge] Error initializing App Bridge:', error);
        setIsInitialized(true); // Don't block rendering on error
      }
    };

    initializeAppBridge();
  }, [searchParams]);

  // Show basic loading state while initializing (very quick)
  if (!isInitialized) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  // If we have App Bridge config, we could initialize the full App Bridge here
  // For now, we just pass through the children with the config available
  // Full App Bridge integration would require @shopify/app-bridge-react package
  
  if (config?.host && process.env.NODE_ENV === 'development') {
    console.log('[AppBridge] App Bridge config ready:', {
      hasHost: !!config.host,
      hasShop: !!config.shop,
      hasApiKey: !!config.apiKey,
    });
  }

  return <>{children}</>;
};

export default AppBridgeProviderWrapper;
