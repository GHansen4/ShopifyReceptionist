'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Bounce page for handling embedded app cookie consent
 * This page is shown when the app can't load due to cookie issues
 */
export default function BouncePage() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const shop = searchParams.get('shop');
  const host = searchParams.get('host');
  const embedded = searchParams.get('embedded');
  
  useEffect(() => {
    // Check if we're in an iframe
    const inIframe = window.self !== window.top;
    const isEmbedded = inIframe || embedded === '1';
    
    console.log('[Bounce] Page loaded with params:', {
      shop,
      host,
      embedded,
      inIframe,
      isEmbedded
    });
    
    if (isEmbedded && shop) {
      // We're in embedded mode, try to redirect to the main app
      // with proper parameters for cookie consent
      const appUrl = new URL(window.location.origin);
      appUrl.searchParams.set('shop', shop);
      if (host) appUrl.searchParams.set('host', host);
      appUrl.searchParams.set('embedded', '1');
      appUrl.searchParams.set('bounce', '1'); // Flag to indicate this came from bounce
      
      console.log('[Bounce] Redirecting to app with URL:', appUrl.toString());
      
      // Try to redirect to the main app
      setTimeout(() => {
        window.location.href = appUrl.toString();
      }, 1000);
    } else {
      // Not in embedded mode, show error
      setError('This page is only accessible from within Shopify Admin.');
      setIsLoading(false);
    }
  }, [shop, host, embedded]);
  
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #0070f3',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <h2 style={{ marginTop: '20px', color: '#333' }}>
          Loading App...
        </h2>
        <p style={{ color: '#666', textAlign: 'center', maxWidth: '400px' }}>
          Setting up your voice receptionist app. This may take a moment.
        </p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <h2 style={{ color: '#d32f2f' }}>Access Error</h2>
        <p style={{ color: '#666', textAlign: 'center', maxWidth: '400px' }}>
          {error}
        </p>
        <button 
          onClick={() => window.location.href = '/'}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Go to Home
        </button>
      </div>
    );
  }
  
  return null;
}
