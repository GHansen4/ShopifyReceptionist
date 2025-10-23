import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

// Force dynamic rendering (uses database and environment variables)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] 🔍 CHECK TOKEN: Testing access token validity...`);

  try {
    const targetShop = 'always-ai-dev-store.myshopify.com';
    
    // Get the session with access token
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('shopify_sessions')
      .select('id, shop, access_token, created_at')
      .eq('shop', targetShop)
      .single();

    if (sessionError || !session) {
      console.error(`[${requestId}] ❌ Session not found:`, sessionError);
      return NextResponse.json({
        success: false,
        error: 'Session not found',
        details: sessionError?.message || 'No session found'
      }, { status: 404 });
    }

    console.log(`[${requestId}] ✅ Found session for ${session.shop}`);
    console.log(`[${requestId}] 🔍 Access token: ${session.access_token ? `${session.access_token.substring(0, 20)}...` : 'missing'}`);

    // Test the access token by making a simple Shopify API call
    const testUrl = `https://${targetShop}/admin/api/2024-01/shop.json`;
    console.log(`[${requestId}] 🔍 Testing token with URL: ${testUrl}`);

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': session.access_token,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log(`[${requestId}] 🔍 Shopify API response:`, {
      status: response.status,
      statusText: response.statusText,
      body: responseText
    });

    if (response.ok) {
      const shopData = JSON.parse(responseText);
      console.log(`[${requestId}] ✅ Token is valid! Shop data:`, {
        name: shopData.shop?.name,
        domain: shopData.shop?.domain,
        email: shopData.shop?.email
      });

      return NextResponse.json({
        success: true,
        message: 'Access token is valid',
        shop: {
          name: shopData.shop?.name,
          domain: shopData.shop?.domain,
          email: shopData.shop?.email,
          currency: shopData.shop?.currency,
          timezone: shopData.shop?.timezone
        },
        token: {
          valid: true,
          prefix: session.access_token.substring(0, 10),
          length: session.access_token.length
        }
      });
    } else {
      console.error(`[${requestId}] ❌ Token is invalid:`, response.status, responseText);
      
      return NextResponse.json({
        success: false,
        error: 'Access token is invalid',
        details: {
          status: response.status,
          statusText: response.statusText,
          body: responseText,
          token: {
            prefix: session.access_token.substring(0, 10),
            length: session.access_token.length
          }
        },
        recommendations: [
          'The access token is invalid or expired',
          'The app may need to be reinstalled in Shopify',
          'Check if the app has the required permissions (read_products scope)',
          'Verify the token format is correct'
        ]
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error(`[${requestId}] ❌ Exception during token check:`, error);
    return NextResponse.json({
      success: false,
      error: 'Exception during token check',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}
