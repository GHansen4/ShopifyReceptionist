import { shopifyApi, ApiVersion } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';
import { env } from '../env';
import { SupabaseSessionStorage } from './session-storage';

/**
 * Initialize Shopify API with Supabase-backed session storage
 * 
 * This configuration follows Shopify's prescribed approach for embedded apps:
 * - Uses official @shopify/shopify-api library
 * - Implements session storage (not manual token management)
 * - Enables automatic token refresh
 * - Works seamlessly with Shopify CLI
 * - Supports authenticate.admin() pattern
 * 
 * Reference: https://github.com/Shopify/shopify-api-js
 */

// Create session storage instance
const sessionStorage = new SupabaseSessionStorage();

// Lazy initialization to avoid build-time env validation errors
let _shopify: ReturnType<typeof shopifyApi> | null = null;

function initShopify() {
  if (_shopify) return _shopify;
  
  _shopify = shopifyApi({
    apiKey: env.SHOPIFY_API_KEY,
    apiSecretKey: env.SHOPIFY_API_SECRET,
    scopes: env.SHOPIFY_SCOPES.split(','),
    hostName: env.SHOPIFY_APP_URL.replace('https://', '').replace('http://', ''),
    hostScheme: env.SHOPIFY_APP_URL.startsWith('https') ? 'https' : 'http',
    apiVersion: ApiVersion.October24, // Use specific API version
    isEmbeddedApp: true,
    sessionStorage: sessionStorage,
    
    // For development logging
    ...(process.env.NODE_ENV === 'development' && {
      logger: {
        level: 'info',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        log: (severity: string, message: string, ...args: any[]) => {
          console.log(`[Shopify API - ${severity}]`, message, ...args);
        },
      },
    }),
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('[Shopify Client] ✅ Initialized with session storage');
    console.log('[Shopify Client] API Version:', ApiVersion.October24);
    console.log('[Shopify Client] Host:', env.SHOPIFY_APP_URL);
    console.log('[Shopify Client] Scopes:', env.SHOPIFY_SCOPES);
  }
  
  return _shopify;
}

// Export shopify instance with lazy initialization
export const shopify = new Proxy({} as ReturnType<typeof shopifyApi>, {
  get(_target, prop) {
    const instance = initShopify();
    return instance[prop as keyof typeof instance];
  }
});

// Legacy export for backward compatibility (will be removed)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function initializeShopifyApp(): any {
  console.warn('[Shopify Client] ⚠️  initializeShopifyApp() is deprecated, use shopify directly');
  return shopify;
}
