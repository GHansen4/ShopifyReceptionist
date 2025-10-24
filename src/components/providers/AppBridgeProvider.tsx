'use client';

import React, { type FC, type ReactNode, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { isProductionEnvironment } from '@/lib/utils/url';

interface AppBridgeProviderWrapperProps {
  children: ReactNode;
}

/**
 * App Bridge v4+ Implementation for Embedded Apps
 * Handles cookie consent and proper embedded mode initialization
 */
function AppBridgeContent({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const [appBridgeReady, setAppBridgeReady] = useState(false);
  const [needsCookieConsent, setNeedsCookieConsent] = useState(false);
  
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
  
  // Handle cookie consent for embedded apps - RELAXED LOGIC
  useEffect(() => {
    if (isActuallyEmbedded && typeof window !== 'undefined') {
      // More lenient cookie detection - only show consent if absolutely necessary
      const hasCookies = document.cookie.length > 0;
      const hasSessionStorage = window.sessionStorage && window.sessionStorage.length > 0;
      const hasLocalStorage = window.localStorage && window.localStorage.length > 0;
      
      console.log('[AppBridge] Cookie check:', {
        hasCookies,
        hasSessionStorage,
        hasLocalStorage,
        cookieString: document.cookie,
        userAgent: navigator.userAgent
      });
      
      // Only show cookie consent if we're truly in an embedded context AND have no storage at all
      // AND we're not in a development environment
      const isStrictEmbedded = isEmbedded && !isEmbeddedParam; // Only iframe, not URL param
      const hasNoStorage = !hasCookies && !hasSessionStorage && !hasLocalStorage;
      const isProduction = process.env.NODE_ENV === 'production';
      
      if (isStrictEmbedded && hasNoStorage && isProduction) {
        console.log('[AppBridge] Strict embedded mode with no storage - may need consent');
        setNeedsCookieConsent(true);
      } else {
        console.log('[AppBridge] Cookie consent not needed - proceeding with App Bridge');
        setNeedsCookieConsent(false);
      }
    }
  }, [isActuallyEmbedded, isEmbedded, isEmbeddedParam]);
  
  // Initialize App Bridge v4+ using createApp pattern - RELAXED APPROACH
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
          setNeedsCookieConsent(false); // Clear cookie consent if App Bridge works
          console.log('[AppBridge] ✅ App Bridge v4+ initialized successfully');
        } catch (error) {
          console.error('[AppBridge] ❌ Failed to initialize App Bridge:', error);
          // Only set cookie consent if it's a real error, not just missing cookies
          if (error.message && error.message.includes('cookie')) {
            setNeedsCookieConsent(true);
          }
        }
      }).catch((error) => {
        console.error('[AppBridge] ❌ Failed to import App Bridge:', error);
        // Only set cookie consent for import errors
        setNeedsCookieConsent(true);
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
    console.log('[AppBridge] Cookie consent needed:', needsCookieConsent);
    console.log('[AppBridge] App Bridge ready:', appBridgeReady);
  }
  
  // Show cookie consent page only if absolutely necessary
  if (needsCookieConsent && isActuallyEmbedded && process.env.NODE_ENV === 'production') {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <h2>Cookie Consent Required</h2>
        <p>This app requires cookies to function properly in embedded mode.</p>
        <button 
          onClick={() => {
            // Try to enable cookies and reload
            window.location.reload();
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Enable Cookies & Reload
        </button>
        <p style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
          If this doesn't work, try opening the app in a new tab or different browser.
        </p>
      </div>
    );
  }

  // In development or if cookie consent is not needed, proceed with app
  if (process.env.NODE_ENV === 'development' && needsCookieConsent) {
    console.log('[AppBridge] Development mode - bypassing cookie consent');
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
