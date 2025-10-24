import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify/client';
import { createErrorResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/client';
import { normalizeShopDomain } from '@/lib/normalize';

// Force dynamic rendering (uses query params)
export const dynamic = 'force-dynamic';

/**
 * OAuth Callback Route - SHOPIFY OFFICIAL PATTERN
 * 
 * Uses Shopify's official auth.callback() method exactly as documented.
 * This follows Shopify's prescribed OAuth callback flow for embedded apps.
 * 
 * GET /api/auth/callback?code=...&hmac=...&shop=...&state=...
 */
export async function GET(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('[OAuth Callback] Processing Shopify OAuth callback');
    }

    // Use Shopify's official OAuth callback - EXACTLY as documented
    const { session } = await shopify.auth.callback({
      rawRequest: request,
      rawResponse: new Response()
    });

    if (!session) {
      console.error('[OAuth Callback] No session created');
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[OAuth Callback] ✅ Session created successfully:', {
        id: session.id,
        shop: session.shop,
        isOnline: session.isOnline,
      });
    }

    // Store business data in shops table (Vapi config, etc.)
    // Shopify handles session storage in shopify_sessions table automatically
    const normalizedShop = normalizeShopDomain(session.shop);
    
    if (session.accessToken) {
      const { error } = await supabaseAdmin
        .from('shops')
        .upsert({
          shop_domain: normalizedShop,
          shop_name: normalizedShop.replace('.myshopify.com', ''),
          access_token: session.accessToken, // Keep for Vapi integration
          installed_at: new Date().toISOString(),
          subscription_status: 'trial',
          plan_name: 'starter',
          call_minutes_used: 0,
          call_minutes_limit: 100,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'shop_domain'
        });

      if (error) {
        console.error('[OAuth Callback] Failed to save shop metadata:', error);
        return NextResponse.json(
          { error: 'Failed to save shop metadata', details: error.message },
          { status: 500 }
        );
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[OAuth Callback] ✅ Shop metadata saved successfully');
      }
    }

    // Redirect to app with session - Shopify handles embedded app redirect
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('shop', session.shop);
    
    // Add host parameter if present (for embedded apps)
    const host = request.nextUrl.searchParams.get('host');
    if (host) {
      redirectUrl.searchParams.set('host', host);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[OAuth Callback] ✅ Redirecting to app:', redirectUrl.toString());
    }
    
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('[OAuth Callback] Error during auth callback:', error);
    return createErrorResponse(error as Error);
  }
}