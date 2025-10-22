import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PolarisProvider } from '@/components/providers/PolarisProvider';
import { AppBridgeProviderWrapper } from '@/components/providers/AppBridgeProvider';

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
        {/* This div helps with App Bridge session token detection */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize session token for Shopify App Bridge
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
                document.documentElement.appendChild(initElement);
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
