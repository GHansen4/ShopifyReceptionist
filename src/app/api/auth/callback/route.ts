import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify/client';
import { createErrorResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/client';
import { env } from '@/lib/env';
import { normalizeShopDomain } from '@/lib/normalize';
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
    
    // Store session via our SupabaseSessionStorage with detailed debugging
    try {
      console.log('[OAuth Callback] 🔍 About to store session:', {
        id: session.id,
        shop: session.shop,
        accessTokenPrefix: session.accessToken?.substring(0, 10)
      });

      const storeResult = await shopify.config.sessionStorage.storeSession(session);

      console.log('[OAuth Callback] Session store result:', storeResult);

      if (!storeResult) {
        console.error('[OAuth Callback] ❌ CRITICAL: storeSession returned false');
        throw new Error('storeSession() returned false - session storage failed');
      }
      
      console.log('[OAuth Callback] ✅ Session stored in shopify_sessions');
      
      // Verify it actually saved
      console.log('[OAuth Callback] 🔍 Verifying session was saved to shopify_sessions...');
      const { data: verifySession, error: verifyError } = await supabaseAdmin
        .from('shopify_sessions')
        .select('id, shop, access_token')
        .eq('id', session.id)
        .single();
      
      console.log('[OAuth Callback] Verification check:', {
        found: !!verifySession,
        error: verifyError?.message,
        sessionId: session.id,
        shop: shop
      });
      
      if (verifyError || !verifySession) {
        console.error('[OAuth Callback] ❌ CRITICAL: Session verification failed:', verifyError);
        throw new Error(`Session save verification failed: ${verifyError?.message || 'No session found'}`);
      }
      
      console.log('[OAuth Callback] ✅ Session verification successful:', {
        id: verifySession.id,
        shop: verifySession.shop,
        tokenPrefix: verifySession.access_token?.substring(0, 10),
        tokenLength: verifySession.access_token?.length
      });
      
    } catch (sessionError) {
      console.error('[OAuth Callback] ❌ CRITICAL: Failed to store session in shopify_sessions:', sessionError);
      console.error('[OAuth Callback] Session storage error details:', {
        error: sessionError instanceof Error ? sessionError.message : 'Unknown error',
        stack: sessionError instanceof Error ? sessionError.stack : undefined
      });
      
      // OAuth MUST fail if session storage fails
      return NextResponse.json(
        {
          error: 'OAuth installation incomplete - session storage failed',
          details: {
            shop,
            error: sessionError instanceof Error ? sessionError.message : 'Unknown error',
            hint: 'Session could not be stored in shopify_sessions table. Check database permissions and table schema.'
          }
        },
        { status: 500 }
      );
    }

    // CRITICAL: Store shop metadata in shops table - OAuth MUST fail if this fails
    console.log('[OAuth Callback] Storing shop metadata in shops table...');
    
    // Normalize shop domain for consistent storage
    const normalizedShop = normalizeShopDomain(shop);
    console.log(`[OAuth Callback] Normalized shop domain: ${normalizedShop}`);
    
    let shopSaveSuccess = false;
    let lastError: any = null;
    
    // Try admin client first
    try {
      const { error } = await supabaseAdmin
        .from('shops')
        .upsert({
          shop_domain: normalizedShop,
          shop_name: normalizedShop.replace('.myshopify.com', ''),
          access_token: accessToken, // This is the offline token
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
        console.error('[OAuth Callback] ❌ Admin client failed:', error);
        lastError = error;
      } else {
      console.log('[OAuth Callback] ✅ Shop metadata stored successfully via admin client');
      shopSaveSuccess = true;
      
      // DEBUG: Verify the token was actually saved
      console.log('[OAuth Callback] 🔍 DEBUG: Verifying saved token...');
      const { data: verifySession, error: verifyError } = await supabaseAdmin
        .from('shopify_sessions')
        .select('shop, access_token')
        .eq('shop', shop)
        .single();
      
      if (verifyError || !verifySession) {
        console.error('[OAuth Callback] ❌ CRITICAL: Token verification failed:', verifyError);
      } else {
        console.log('[OAuth Callback] ✅ Token verification successful:', {
          shop: verifySession.shop,
          tokenPrefix: verifySession.access_token?.substring(0, 10),
          tokenLength: verifySession.access_token?.length
        });
      }
      }
    } catch (adminError) {
      console.error('[OAuth Callback] ❌ Admin client exception:', adminError);
      lastError = adminError;
    }
    
    // If admin client failed, try regular client as fallback
    if (!shopSaveSuccess) {
      console.log('[OAuth Callback] 🔄 Trying regular Supabase client as fallback...');
      try {
        const { supabase } = await import('@/lib/supabase/client');
        const { error } = await supabase
          .from('shops')
          .upsert({
            shop_domain: shop,
            shop_name: shop.replace('.myshopify.com', ''),
            access_token: accessToken,
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
          console.error('[OAuth Callback] ❌ Regular client also failed:', error);
          lastError = error;
        } else {
          console.log('[OAuth Callback] ✅ Shop metadata stored successfully via regular client');
          shopSaveSuccess = true;
        }
      } catch (regularError) {
        console.error('[OAuth Callback] ❌ Regular client exception:', regularError);
        lastError = regularError;
      }
    }
    
    // CRITICAL: If both clients failed, OAuth installation is incomplete
    if (!shopSaveSuccess) {
      console.error('[OAuth Callback] ❌ CRITICAL: Both Supabase clients failed to save shop data');
      console.error('[OAuth Callback] Last error:', lastError);
      
      return NextResponse.json(
        { 
          error: 'OAuth installation incomplete - failed to save shop data',
          details: {
            shop,
            error: lastError?.message || 'Unknown error',
            code: lastError?.code || 'DATABASE_ERROR',
            hint: 'Both Supabase clients failed. Check database permissions and configuration.'
          }
        },
        { status: 500 }
      );
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
