import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] 🔍 CHECK APP PERMISSIONS: Analyzing app permissions and scopes...`);

  try {
    const targetShop = 'always-ai-dev-store.myshopify.com';
    
    // Get the current token
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('shopify_sessions')
      .select('access_token')
      .eq('shop', targetShop)
      .single();

    if (sessionError || !session) {
      console.error(`[${requestId}] ❌ No session found:`, sessionError);
      return NextResponse.json({
        success: false,
        error: 'No session found',
        details: sessionError?.message || 'No session found'
      }, { status: 404 });
    }

    console.log(`[${requestId}] ✅ Found session, testing permissions...`);

    // Test different Shopify API endpoints to see what permissions we have
    const permissionTests = [];

    // Test 1: Basic shop info (should work with any valid token)
    try {
      const shopResponse = await fetch(`https://${targetShop}/admin/api/2024-01/shop.json`, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': session.access_token,
          'Content-Type': 'application/json',
        },
      });
      
      permissionTests.push({
        endpoint: 'shop.json',
        status: shopResponse.status,
        success: shopResponse.ok,
        description: 'Basic shop information (should work with any valid token)'
      });
    } catch (error: any) {
      permissionTests.push({
        endpoint: 'shop.json',
        error: error.message,
        success: false,
        description: 'Basic shop information (should work with any valid token)'
      });
    }

    // Test 2: Products endpoint (requires read_products scope)
    try {
      const productsResponse = await fetch(`https://${targetShop}/admin/api/2024-01/products.json?limit=1`, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': session.access_token,
          'Content-Type': 'application/json',
        },
      });
      
      permissionTests.push({
        endpoint: 'products.json',
        status: productsResponse.status,
        success: productsResponse.ok,
        description: 'Products endpoint (requires read_products scope)'
      });
    } catch (error: any) {
      permissionTests.push({
        endpoint: 'products.json',
        error: error.message,
        success: false,
        description: 'Products endpoint (requires read_products scope)'
      });
    }

    // Test 3: Orders endpoint (requires read_orders scope)
    try {
      const ordersResponse = await fetch(`https://${targetShop}/admin/api/2024-01/orders.json?limit=1`, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': session.access_token,
          'Content-Type': 'application/json',
        },
      });
      
      permissionTests.push({
        endpoint: 'orders.json',
        status: ordersResponse.status,
        success: ordersResponse.ok,
        description: 'Orders endpoint (requires read_orders scope)'
      });
    } catch (error: any) {
      permissionTests.push({
        endpoint: 'orders.json',
        error: error.message,
        success: false,
        description: 'Orders endpoint (requires read_orders scope)'
      });
    }

    // Analyze results
    const hasBasicAccess = permissionTests.some(test => test.endpoint === 'shop.json' && test.success);
    const hasProductAccess = permissionTests.some(test => test.endpoint === 'products.json' && test.success);
    const hasOrderAccess = permissionTests.some(test => test.endpoint === 'orders.json' && test.success);

    const analysis = {
      token: {
        prefix: session.access_token.substring(0, 10),
        length: session.access_token.length,
        valid: hasBasicAccess
      },
      permissions: {
        basic: hasBasicAccess,
        products: hasProductAccess,
        orders: hasOrderAccess
      },
      tests: permissionTests,
      recommendations: []
    };

    // Generate recommendations
    if (!hasBasicAccess) {
      analysis.recommendations.push('❌ Token is completely invalid - app needs to be reinstalled');
    } else if (!hasProductAccess) {
      analysis.recommendations.push('❌ Token is valid but missing read_products scope');
      analysis.recommendations.push('🔧 App needs to be reinstalled with read_products permission');
    } else {
      analysis.recommendations.push('✅ Token is valid and has required permissions');
    }

    if (hasBasicAccess && !hasProductAccess) {
      analysis.recommendations.push('💡 Check Shopify app configuration - ensure read_products scope is enabled');
    }

    console.log(`[${requestId}] ✅ App permissions analysis complete:`, analysis);

    return NextResponse.json({
      success: true,
      analysis,
      message: 'App permissions analyzed'
    });

  } catch (error: any) {
    console.error(`[${requestId}] ❌ Exception during app permissions check:`, error);
    return NextResponse.json({
      success: false,
      error: 'Exception during app permissions check',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}
