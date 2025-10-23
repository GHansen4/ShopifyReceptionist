import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] 🔍 TEST TOKEN DIRECTLY: Testing access token validity...`);

  try {
    const targetShop = 'always-ai-dev-store.myshopify.com';
    
    // Get the current token from database
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('shopify_sessions')
      .select('access_token, created_at')
      .eq('shop', targetShop)
      .single();

    if (sessionError || !session) {
      console.error(`[${requestId}] ❌ No session found:`, sessionError);
      return NextResponse.json({
        success: false,
        error: 'No session found in database',
        details: 'OAuth flow may not have completed properly'
      }, { status: 404 });
    }

    console.log(`[${requestId}] ✅ Found session, testing token directly...`);
    console.log(`[${requestId}] Token details:`, {
      prefix: session.access_token.substring(0, 10),
      length: session.access_token.length,
      created: session.created_at
    });

    // Test the token with a simple Shopify API call
    const testUrl = `https://${targetShop}/admin/api/2024-01/shop.json`;
    console.log(`[${requestId}] Testing URL: ${testUrl}`);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': session.access_token,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log(`[${requestId}] Response:`, {
      status: response.status,
      statusText: response.statusText,
      body: responseText
    });

    if (response.ok) {
      const shopData = JSON.parse(responseText);
      console.log(`[${requestId}] ✅ Token is valid! Shop: ${shopData.shop?.name}`);
      
      return NextResponse.json({
        success: true,
        message: 'Token is valid and working',
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
          length: session.access_token.length,
          created: session.created_at
        }
      });
    } else {
      console.error(`[${requestId}] ❌ Token is invalid:`, response.status, responseText);
      
      return NextResponse.json({
        success: false,
        error: 'Token is invalid',
        details: {
          status: response.status,
          statusText: response.statusText,
          body: responseText,
          token: {
            prefix: session.access_token.substring(0, 10),
            length: session.access_token.length,
            created: session.created_at
          }
        },
        recommendations: [
          'Token is invalid or expired',
          'App may need to be reinstalled in Shopify',
          'Check if app has required permissions (read_products scope)',
          'Verify token format is correct'
        ]
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error(`[${requestId}] ❌ Exception during token test:`, error);
    return NextResponse.json({
      success: false,
      error: 'Exception during token test',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}
