/**
 * URL Helper Functions
 * Provides consistent URL construction across the application
 */

/**
 * Get the base URL for the application
 * Handles both local development and production (Vercel) environments
 */
export function getAppUrl(): string {
  // Priority 1: NEXT_PUBLIC_APP_URL (explicitly set)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // Priority 2: VERCEL_URL (automatically provided by Vercel)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Priority 3: SHOPIFY_APP_URL (from Shopify CLI tunnel)
  if (process.env.SHOPIFY_APP_URL) {
    return process.env.SHOPIFY_APP_URL;
  }
  
  // Priority 4: Fallback to localhost for development
  return 'https://localhost:3000';
}

/**
 * Get the Vapi functions URL
 * Used for Vapi assistant serverUrl configuration
 */
export function getVapiFunctionsUrl(): string {
  const baseUrl = getAppUrl();
  return `${baseUrl}/api/vapi/functions`;
}

/**
 * Get the OAuth callback URL
 * Used for Shopify OAuth redirect configuration
 */
export function getOAuthCallbackUrl(): string {
  const baseUrl = getAppUrl();
  return `${baseUrl}/api/auth/callback`;
}

/**
 * Get the OAuth initiation URL
 * Used for Shopify OAuth flow
 */
export function getOAuthUrl(): string {
  const baseUrl = getAppUrl();
  return `${baseUrl}/api/auth`;
}

/**
 * Check if the current URL is localhost (development)
 */
export function isLocalhost(): boolean {
  const url = getAppUrl();
  return url.includes('localhost') || url.includes('127.0.0.1');
}

/**
 * Check if the current URL is production (Vercel)
 */
export function isProduction(): boolean {
  const url = getAppUrl();
  return url.includes('vercel.app') || url.includes('vercel.com');
}

/**
 * Get environment information for debugging
 */
export function getEnvironmentInfo() {
  return {
    appUrl: getAppUrl(),
    vapiFunctionsUrl: getVapiFunctionsUrl(),
    oauthCallbackUrl: getOAuthCallbackUrl(),
    oauthUrl: getOAuthUrl(),
    isLocalhost: isLocalhost(),
    isProduction: isProduction(),
    environment: {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      VERCEL_URL: process.env.VERCEL_URL,
      SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
    }
  };
}
