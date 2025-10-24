import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PolarisProvider } from '@/components/providers/PolarisProvider';
import { AppBridgeProviderWrapper } from '@/components/providers/AppBridgeProvider';

// Force dynamic rendering for all pages (Shopify embedded app receives query params)
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Voice Receptionist | Shopify App',
  description: 'Professional voice-first AI receptionist for Shopify stores',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Enhanced cookie and session handling for embedded apps */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize session token and cookie handling for Shopify App Bridge
              (function() {
                const initElement = document.createElement('div');
                initElement.id = 'shopify-app-init';
                
                // Try to get session token from window
                if (typeof window !== 'undefined' && window.sessionStorage) {
                  const token = window.sessionStorage.getItem('appBridge');
                  if (token) {
                    initElement.setAttribute('data-session-token', token);
                  }
                }
                
                // Set cookie consent attributes for embedded apps
                const urlParams = new URLSearchParams(window.location.search);
                const isEmbedded = urlParams.get('embedded') === '1' || window.self !== window.top;
                if (isEmbedded) {
                  initElement.setAttribute('data-embedded', 'true');
                  initElement.setAttribute('data-cookie-consent', 'required');
                }
                
                document.documentElement.appendChild(initElement);
                
                // Log cookie status for debugging
                console.log('[Layout] Cookie status:', {
                  hasCookies: document.cookie.length > 0,
                  cookieString: document.cookie,
                  isEmbedded: isEmbedded,
                  hasSessionStorage: window.sessionStorage && window.sessionStorage.length > 0
                });
              })();
            `,
          }}
        />
      </head>
      <body>
        <AppBridgeProviderWrapper>
          <PolarisProvider>{children}</PolarisProvider>
        </AppBridgeProviderWrapper>
      </body>
    </html>
  );
}
