import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify/client';
import { createErrorResponse } from '@/lib/utils/api';
import { ValidationError } from '@/lib/utils/errors';

/**
 * OAuth Initiation Route - SHOPIFY OFFICIAL PATTERN
 * 
 * Uses Shopify's official auth.begin() method exactly as documented.
 * This follows Shopify's prescribed OAuth flow for embedded apps.
 * 
 * GET /api/auth?shop=<shop-domain>
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop');

    if (process.env.NODE_ENV === 'development') {
      console.log('[OAuth] Initiating Shopify OAuth flow for shop:', shop);
    }

    if (!shop) {
      throw new ValidationError('Shop domain is required');
    }

    // Normalize shop domain
    const shopDomain = shop.replace('https://', '').replace('http://', '');

    // Use Shopify's official OAuth flow - EXACTLY as documented
    const authUrl = await shopify.auth.begin({
      shop: shopDomain,
      callbackPath: '/api/auth/callback',
      isOnline: false
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[OAuth] ✅ Shopify OAuth URL generated, redirecting...');
    }

    return NextResponse.redirect(authUrl);

  } catch (error) {
    console.error('[OAuth] Error during auth initiation:', error);
    return createErrorResponse(error as Error);
  }
}
