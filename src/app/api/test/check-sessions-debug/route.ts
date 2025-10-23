import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] 🔍 CHECK SESSIONS DEBUG: Comprehensive session analysis...`);

  try {
    const targetShop = 'always-ai-dev-store.myshopify.com';
    
    // Check shopify_sessions table
    console.log(`[${requestId}] 🔍 Checking shopify_sessions table...`);
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('shopify_sessions')
      .select('*')
      .eq('shop', targetShop);

    console.log(`[${requestId}] 🔍 shopify_sessions result:`, {
      error: sessionsError,
      count: sessions?.length || 0,
      sessions: sessions
    });

    // Check shops table
    console.log(`[${requestId}] 🔍 Checking shops table...`);
    const { data: shops, error: shopsError } = await supabaseAdmin
      .from('shops')
      .select('*')
      .eq('shop_domain', targetShop);

    console.log(`[${requestId}] 🔍 shops result:`, {
      error: shopsError,
      count: shops?.length || 0,
      shops: shops
    });

    // Test the token from shopify_sessions if it exists
    let tokenTestResult = null;
    if (sessions && sessions.length > 0) {
      const session = sessions[0];
      console.log(`[${requestId}] 🔍 Testing token from shopify_sessions...`);
      
      try {
        const testUrl = `https://${targetShop}/admin/api/2024-01/shop.json`;
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'X-Shopify-Access-Token': session.access_token,
            'Content-Type': 'application/json',
          },
        });

        const responseText = await response.text();
        tokenTestResult = {
          status: response.status,
          success: response.ok,
          body: responseText,
          tokenPrefix: session.access_token?.substring(0, 10),
          tokenLength: session.access_token?.length
        };
      } catch (testError: any) {
        tokenTestResult = {
          error: testError.message,
          tokenPrefix: session.access_token?.substring(0, 10),
          tokenLength: session.access_token?.length
        };
      }
    }

    return NextResponse.json({
      success: true,
      targetShop,
      shopify_sessions: {
        error: sessionsError,
        count: sessions?.length || 0,
        sessions: sessions?.map(s => ({
          id: s.id,
          shop: s.shop,
          access_token: s.access_token ? `${s.access_token.substring(0, 10)}...` : 'missing',
          created_at: s.created_at
        })) || []
      },
      shops: {
        error: shopsError,
        count: shops?.length || 0,
        shops: shops?.map(s => ({
          id: s.id,
          shop_domain: s.shop_domain,
          access_token: s.access_token ? `${s.access_token.substring(0, 10)}...` : 'missing',
          created_at: s.created_at
        })) || []
      },
      tokenTest: tokenTestResult,
      recommendations: [
        sessions?.length === 0 ? 'No sessions found in shopify_sessions table' : 'Sessions found in shopify_sessions table',
        shops?.length === 0 ? 'No shops found in shops table' : 'Shops found in shops table',
        tokenTestResult?.success ? 'Token is valid' : 'Token is invalid or not found'
      ]
    });

  } catch (error: any) {
    console.error(`[${requestId}] ❌ Exception during session debug:`, error);
    return NextResponse.json({
      success: false,
      error: 'Exception during session debug',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}
