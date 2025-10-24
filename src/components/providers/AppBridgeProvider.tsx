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
  
  // Check for production environment and localhost usage
  const isProduction = isProductionEnvironment();
  const isUsingLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  
  if (isProduction && isUsingLocalhost) {
    console.error('[AppBridge] ❌ CRITICAL: Production environment detected but using localhost URL');
    console.error('[AppBridge] This will cause issues with Shopify App Bridge and external services');
    console.error('[AppBridge] Please ensure NEXT_PUBLIC_APP_URL is set to your production domain');
  }

  // Debug logging with improved environment detection
  if (process.env.NODE_ENV === 'development') {
    console.log('[DEBUG] === AppBridge Environment Debug ===');
    console.log('[DEBUG] NODE_ENV:', process.env.NODE_ENV);
    console.log('[DEBUG] VERCEL:', process.env.VERCEL);
    console.log('[DEBUG] Is Production Environment:', isProduction);
    console.log('[DEBUG] Is Using Localhost:', isUsingLocalhost);
    console.log('[DEBUG] NEXT_PUBLIC_SHOPIFY_API_KEY:', process.env.NEXT_PUBLIC_SHOPIFY_API_KEY ? 'configured' : 'MISSING');
    console.log('[DEBUG] NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL || 'NOT SET');
    console.log('[DEBUG] VERCEL_URL:', process.env.VERCEL_URL || 'NOT SET');
    console.log('[DEBUG] SHOPIFY_APP_URL:', process.env.SHOPIFY_APP_URL || 'NOT SET');
    console.log('[DEBUG] === Host Parameter Debug ===');
    console.log('[DEBUG] Host from searchParams:', host);
    console.log('[DEBUG] Host from window.location:', windowHost);
    console.log('[DEBUG] Final host:', finalHost);
    console.log('[DEBUG] Is embedded (window):', isEmbedded);
    console.log('[DEBUG] Is embedded (param):', isEmbeddedParam);
    console.log('[DEBUG] Is actually embedded:', isActuallyEmbedded);
    console.log('[DEBUG] === End Debug ===');
  }
  
  // App Bridge handles cookie management automatically - no custom logic needed
  
  // Initialize App Bridge v4+ using createApp pattern - SHOPIFY BEST PRACTICES
  useEffect(() => {
    if (isActuallyEmbedded && finalHost && apiKey) {
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
          
          setAppBridgeReady(true);
          console.log('[AppBridge] ✅ App Bridge v4+ initialized successfully');
        } catch (error) {
          console.error('[AppBridge] ❌ Failed to initialize App Bridge:', error);
          // Let App Bridge handle its own error recovery
        }
      }).catch((error) => {
        console.error('[AppBridge] ❌ Failed to import App Bridge:', error);
        // Let App Bridge handle its own error recovery
      });
    } else {
      // Log why App Bridge wasn't initialized
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
  
  // Log initialization status
  if (process.env.NODE_ENV === 'development' && isActuallyEmbedded) {
    console.log('[AppBridge] Initializing in embedded mode');
    console.log('[AppBridge] Shop:', shop || 'not provided');
    console.log('[AppBridge] Host:', finalHost ? 'present' : 'missing');
    console.log('[AppBridge] API Key:', apiKey ? 'configured' : 'MISSING - Set NEXT_PUBLIC_SHOPIFY_API_KEY');
    console.log('[AppBridge] App Bridge ready:', appBridgeReady);
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
