import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify/client';
import { createErrorResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/client';
import { env } from '@/lib/env';
import crypto from 'crypto';

// Force dynamic rendering (uses query params)
export const dynamic = 'force-dynamic';

/**
 * OAuth Callback Route - Manual OAuth for Next.js App Router Compatibility
 * 
 * Handles OAuth callback from Shopify:
 * - Validates HMAC
 * - Validates state
 * - Exchanges code for access token
 * - Stores session in SupabaseSessionStorage
 * 
 * GET /api/auth/callback?code=...&hmac=...&shop=...&state=...
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const hmac = searchParams.get('hmac');
    const shop = searchParams.get('shop');
    const state = searchParams.get('state');
    const host = searchParams.get('host');

    if (process.env.NODE_ENV === 'development') {
      console.log('[OAuth Callback] ═══════════════════════════════════════════════════════');
      console.log('[OAuth Callback] Processing OAuth callback for shop:', shop);
      console.log('[OAuth Callback] Code present:', !!code);
      console.log('[OAuth Callback] HMAC present:', !!hmac);
      console.log('[OAuth Callback] State present:', !!state);
    }

    // Validate required parameters
    if (!code || !hmac || !shop || !state) {
      return NextResponse.json(
        { error: 'Missing required OAuth parameters' },
        { status: 400 }
      );
    }

    // Validate state from cookies
    const savedState = request.cookies.get('shopify_oauth_state')?.value;
    const savedShop = request.cookies.get('shopify_oauth_shop')?.value;

    if (!savedState || !savedShop) {
      return NextResponse.json(
        { error: 'OAuth state not found - session may have expired' },
        { status: 400 }
      );
    }

    if (savedState !== state || savedShop !== shop) {
      return NextResponse.json(
        { error: 'Invalid OAuth state - possible CSRF attempt' },
        { status: 400 }
      );
    }

    // Validate HMAC
    const params = new URLSearchParams(searchParams);
    params.delete('hmac');
    params.delete('signature');
    const message = params.toString();
    
    const generatedHmac = crypto
      .createHmac('sha256', env.SHOPIFY_API_SECRET)
      .update(message)
      .digest('hex');

    if (generatedHmac !== hmac) {
      return NextResponse.json(
        { error: 'Invalid HMAC - request not from Shopify' },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[OAuth Callback] ✅ HMAC validated');
      console.log('[OAuth Callback] ✅ State validated');
      console.log('[OAuth Callback] Exchanging code for access token...');
    }

    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.SHOPIFY_API_KEY,
        client_secret: env.SHOPIFY_API_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[OAuth Callback] Token exchange failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to exchange authorization code for access token' },
        { status: 500 }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error('[OAuth Callback] No access token in response');
      return NextResponse.json(
        { error: 'No access token received from Shopify' },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[OAuth Callback] ✅ Access token received');
      console.log('[OAuth Callback] Token starts with:', accessToken.substring(0, 10) + '...');
    }

    // Store session in Supabase using Shopify's session format
    const sessionId = `offline_${shop}`;
    const session = shopify.session.customAppSession(shop);
    session.accessToken = accessToken;
    session.isOnline = false;
    
    // Store session via our SupabaseSessionStorage
    await shopify.config.sessionStorage.storeSession(session);

    if (process.env.NODE_ENV === 'development') {
      console.log('[OAuth Callback] ✅ Session stored in Supabase');
    }

    // Store shop metadata in shops table
    try {
      const { error } = await supabaseAdmin
        .from('shops')
        .upsert({
          shop_domain: shop,
          shop_name: shop.replace('.myshopify.com', ''),
          access_token: accessToken,
          installed_at: new Date().toISOString(),
          subscription_status: 'trial',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'shop_domain'
        });

      if (error) {
        console.error('[OAuth Callback] Failed to store shop metadata:', error);
      } else if (process.env.NODE_ENV === 'development') {
        console.log('[OAuth Callback] ✅ Shop metadata stored');
      }
    } catch (metadataError) {
      console.error('[OAuth Callback] Error storing shop metadata:', metadataError);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[OAuth Callback] Redirecting to app home page');
      console.log('[OAuth Callback] ═══════════════════════════════════════════════════════');
    }

    // Redirect to app home page
    const redirectUrl = `/?shop=${shop}${host ? `&host=${encodeURIComponent(host)}` : ''}`;
    
    // Clear OAuth cookies
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));
    response.cookies.delete('shopify_oauth_state');
    response.cookies.delete('shopify_oauth_shop');
    
    return response;

  } catch (error) {
    console.error('[OAuth Callback] Unexpected error during OAuth callback:', error);
    return createErrorResponse(error as Error);
  }
}
