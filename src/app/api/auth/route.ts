import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify/client';
import { createErrorResponse } from '@/lib/utils/api';
import { ValidationError } from '@/lib/utils/errors';
import { withAuthRateLimit } from '@/lib/rate-limiter-middleware';

/**
 * OAuth Initiation Route - Official Shopify OAuth Implementation
 * 
 * Uses Shopify's official auth.begin() method for secure OAuth flow.
 * This replaces the manual OAuth implementation with Shopify's built-in security.
 * 
 * GET /api/auth?shop=<shop-domain>
 */
export async function GET(request: NextRequest) {
  console.log('🚨🚨🚨 OAUTH INITIATION STARTED (OFFICIAL) 🚨🚨🚨');
  console.log('URL:', request.url);
  console.log('Search params:', request.nextUrl.searchParams.toString());
  
  return withAuthRateLimit(request, async () => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const shop = searchParams.get('shop');

      console.log('🚨🚨🚨 OAUTH INITIATION - Shop:', shop);

      if (process.env.NODE_ENV === 'development') {
        console.log('[OAuth] ═══════════════════════════════════════════════════════');
        console.log('[OAuth] Initiating OFFICIAL OAuth flow for shop:', shop);
      }

      if (!shop) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[OAuth] ERROR: Shop domain is required');
        }
        throw new ValidationError('Shop domain is required');
      }

      // Normalize shop domain
      const shopDomain = shop.replace('https://', '').replace('http://', '');

      if (process.env.NODE_ENV === 'development') {
        console.log('[OAuth] Using official Shopify OAuth flow');
        console.log('[OAuth] Shop domain:', shopDomain);
      }

      // Use official Shopify OAuth flow - SECURE APPROACH
      const authUrl = await shopify.auth.begin({
        shop: shopDomain,
        callbackPath: '/api/auth/callback',
        isOnline: false
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('[OAuth] ✅ Official OAuth URL generated');
        console.log('[OAuth] ✅ Redirecting to Shopify (SECURE)');
        console.log('[OAuth] ═══════════════════════════════════════════════════════');
      }

      return NextResponse.redirect(authUrl);

    } catch (error) {
      console.error('[OAuth] Unexpected error during auth initiation:', error);
      return createErrorResponse(error as Error);
    }
  });
}
