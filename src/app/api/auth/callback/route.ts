import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify/client';
import { createErrorResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/client';
import { normalizeShopDomain } from '@/lib/normalize';

// Force dynamic rendering (uses query params)
export const dynamic = 'force-dynamic';

/**
 * OAuth Callback Route - Official Shopify OAuth Implementation
 * 
 * Uses Shopify's official auth.callback() method for secure OAuth handling.
 * This replaces the manual OAuth implementation with Shopify's built-in security.
 * 
 * GET /api/auth/callback?code=...&hmac=...&shop=...&state=...
 */
export async function GET(request: NextRequest) {
  console.log('🚨🚨🚨 OAUTH CALLBACK STARTED (OFFICIAL) 🚨🚨🚨');
  console.log('URL:', request.url);
  console.log('Search params:', request.nextUrl.searchParams.toString());
  
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('[OAuth Callback] ═══════════════════════════════════════════════════════');
      console.log('[OAuth Callback] Processing OFFICIAL OAuth callback');
    }

    // Use official Shopify OAuth callback - SECURE APPROACH
    const { session } = await shopify.auth.callback({
      rawRequest: request,
      rawResponse: new Response()
    });

    if (!session) {
      console.error('[OAuth Callback] ❌ No session created');
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[OAuth Callback] ✅ Session created successfully');
      console.log('[OAuth Callback] Shop:', session.shop);
      console.log('[OAuth Callback] Session ID:', session.id);
      console.log('[OAuth Callback] Is Online:', session.isOnline);
    }

    // Store shop metadata in our shops table for Vapi integration
    const normalizedShop = normalizeShopDomain(session.shop);
    
    console.log('[OAuth Callback] 🔍 About to insert into shops table:', {
      shopDomain: normalizedShop,
      accessToken: session.accessToken ? `${session.accessToken.substring(0, 10)}...` : 'NULL',
      accessTokenLength: session.accessToken?.length,
      accessTokenType: typeof session.accessToken
    });

    // Store shop metadata using admin client
    try {
      const { error } = await supabaseAdmin
        .from('shops')
        .upsert({
          shop_domain: normalizedShop,
          shop_name: normalizedShop.replace('.myshopify.com', ''),
          access_token: session.accessToken, // Position 3 - required access_token column
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
        console.error('[OAuth Callback] ❌ Failed to save shop metadata:', error);
        return NextResponse.json(
          { 
            error: 'Failed to save shop metadata',
            details: error.message
          },
          { status: 500 }
        );
      }

      console.log('[OAuth Callback] ✅ Shop metadata saved successfully');
    } catch (dbError) {
      console.error('[OAuth Callback] ❌ Database error:', dbError);
      return NextResponse.json(
        { 
          error: 'Database error',
          details: dbError instanceof Error ? dbError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[OAuth Callback] ✅ OAuth flow completed successfully (OFFICIAL)');
      console.log('[OAuth Callback] ═══════════════════════════════════════════════════════');
    }

    // Redirect to app with session
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('shop', session.shop);
    
    // Add host parameter if present
    const host = request.nextUrl.searchParams.get('host');
    if (host) {
      redirectUrl.searchParams.set('host', host);
    }
    
    // 🚨🚨🚨 OAUTH CALLBACK COMPLETED (OFFICIAL) 🚨🚨🚨
    console.log('🚨🚨🚨 OAUTH CALLBACK COMPLETED (OFFICIAL) 🚨🚨🚨');
    
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('[OAuth Callback] Unexpected error during callback:', error);
    return createErrorResponse(error as Error);
  }
}