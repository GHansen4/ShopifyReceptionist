import { shopifyApi, ApiVersion, Session } from '@shopify/shopify-api';
import { NextRequest } from 'next/server';
import { env } from '../env';

/**
 * Initialize Shopify API client
 * This handles session token validation automatically
 */
export const shopify = shopifyApi({
  apiKey: env.SHOPIFY_API_KEY,
  apiSecretKey: env.SHOPIFY_API_SECRET,
  scopes: env.SHOPIFY_SCOPES.split(','),
  hostName: env.SHOPIFY_APP_URL.replace('https://', '').replace('http://', ''),
  apiVersion: ApiVersion.January25,
  isEmbeddedApp: true,
  // Session storage (for CLI development, we use in-memory)
  sessionStorage: new shopifyApi.session.MemorySessionStorage(),
});

/**
 * Extract and validate session token from Authorization header
 * This is the official Shopify pattern for embedded apps
 * 
 * During development with `shopify app dev`:
 * - CLI automatically injects session tokens
 * - Tokens come in Authorization header as "Bearer <jwt>"
 * - This function validates and decodes them
 */
export async function validateSessionToken(request: NextRequest): Promise<{
  valid: boolean;
  session?: Session;
  shop?: string;
  error?: string;
}> {
  try {
    // Extract Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false, error: 'No session token provided' };
    }

    const token = authHeader.replace('Bearer ', '');

    // Validate session token using Shopify's official library
    const payload = await shopify.session.decodeSessionToken(token);

    // Create session object
    const session = new Session({
      id: `${payload.dest}`,
      shop: payload.dest,
      state: 'active',
      isOnline: false,
    });

    return {
      valid: true,
      session,
      shop: payload.dest,
    };
  } catch (error: any) {
    console.error('[Session] Token validation failed:', error.message);
    return {
      valid: false,
      error: error.message || 'Invalid session token',
    };
  }
}

/**
 * Get shop domain from session token
 * For API routes that need shop parameter
 */
export async function getShopFromRequest(request: NextRequest): Promise<string | null> {
  // Try URL param first (for non-authenticated routes)
  const shop = request.nextUrl.searchParams.get('shop');
  if (shop) return shop;

  // Try session token
  const result = await validateSessionToken(request);
  return result.shop || null;
}

/**
 * Create Shopify GraphQL client for a shop
 * Uses access token from database
 */
export async function createShopifyClient(shop: string, accessToken: string) {
  const session = new Session({
    id: `offline_${shop}`,
    shop: shop,
    state: 'active',
    isOnline: false,
    accessToken: accessToken,
  });

  return {
    graphql: new shopify.clients.Graphql({ session }),
    rest: new shopify.clients.Rest({ session }),
    session,
  };
}

