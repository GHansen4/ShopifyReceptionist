import { NextRequest } from 'next/server';

/**
 * Shop context extracted from validated session token
 */
export interface ShopContext {
  shop: string;
  sessionToken: string;
  userId: string;
}

/**
 * Extracts shop context from request headers (set by middleware)
 */
export function getShopContext(request: NextRequest): ShopContext | null {
  const shop = request.headers.get('x-shopify-shop');
  const sessionToken = request.headers.get('x-shopify-session-token');
  const userId = request.headers.get('x-shopify-user-id');

  if (!shop || !sessionToken || !userId) {
    return null;
  }

  return {
    shop,
    sessionToken,
    userId,
  };
}

/**
 * Checks if request is authenticated
 */
export function isAuthenticated(request: NextRequest): boolean {
  return getShopContext(request) !== null;
}
