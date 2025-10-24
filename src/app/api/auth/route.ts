import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify/client';
import { createErrorResponse } from '@/lib/utils/api';
import { ValidationError } from '@/lib/utils/errors';
import { withAuthRateLimit } from '@/lib/rate-limiter-middleware';
import { env } from '@/lib/env';
import crypto from 'crypto';

/**
 * OAuth Initiation Route - Manual OAuth for Next.js App Router Compatibility
 * 
 * We construct the OAuth URL manually because shopify.auth.begin() requires
 * Node.js native request/response objects which aren't available in Next.js App Router.
 * 
 * The session will still be stored in SupabaseSessionStorage when callback happens.
 * 
 * GET /api/auth?shop=<shop-domain>
 */
export async function GET(request: NextRequest) {
  // 🚨🚨🚨 VERY OBVIOUS LOGGING TO PROVE OAUTH INITIATION 🚨🚨🚨
  console.log('🚨🚨🚨 OAUTH INITIATION STARTED 🚨🚨🚨');
  console.log('URL:', request.url);
  console.log('Search params:', request.nextUrl.searchParams.toString());
  
  return withAuthRateLimit(request, async () => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const shop = searchParams.get('shop');

      console.log('🚨🚨🚨 OAUTH INITIATION - Shop:', shop);

      if (process.env.NODE_ENV === 'development') {
        console.log('[OAuth] ═══════════════════════════════════════════════════════');
        console.log('[OAuth] Initiating OAuth flow for shop:', shop);
      }

      if (!shop) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[OAuth] ERROR: Shop domain is required');
        }
        throw new ValidationError('Shop domain is required');
      }

      // Normalize shop domain
      const shopDomain = shop.replace('https://', '').replace('http://', '');
      
      // Generate OAuth state for CSRF protection
      const state = crypto.randomBytes(32).toString('hex');
      const nonce = crypto.randomBytes(16).toString('hex');

      if (process.env.NODE_ENV === 'development') {
        console.log('[OAuth] Generated state:', state.substring(0, 10) + '...');
        console.log('[OAuth] Generated nonce:', nonce.substring(0, 10) + '...');
      }

      // Store state in session storage via Shopify's session system
      // We'll create a temporary session to hold the OAuth state
      const tempSessionId = `offline_${shopDomain}`;
      await shopify.session.customAppSession(shopDomain);

      // Construct OAuth authorization URL manually
      const redirectUri = `${env.SHOPIFY_APP_URL}/api/auth/callback`;
      const scopes = env.SHOPIFY_SCOPES;
      
      const authUrl = new URL(`https://${shopDomain}/admin/oauth/authorize`);
      authUrl.searchParams.set('client_id', env.SHOPIFY_API_KEY);
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('grant_options[]', 'per-user');

      if (process.env.NODE_ENV === 'development') {
        console.log('[OAuth] Redirect URI:', redirectUri);
        console.log('[OAuth] Scopes:', scopes);
        console.log('[OAuth] Authorization URL generated');
        console.log('[OAuth] ✅ Redirecting to Shopify');
        console.log('[OAuth] ═══════════════════════════════════════════════════════');
      }

      // Store state in cookies as backup
      const response = NextResponse.redirect(authUrl.toString());
      response.cookies.set('shopify_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
        path: '/',
      });
      response.cookies.set('shopify_oauth_shop', shopDomain, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600,
        path: '/',
      });

      return response;

    } catch (error) {
      console.error('[OAuth] Unexpected error during auth initiation:', error);
      return createErrorResponse(error as Error);
    }
  });
}
