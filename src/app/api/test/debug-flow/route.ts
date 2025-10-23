import { NextRequest, NextResponse } from 'next/server';
import { getShopContext } from '@/lib/shopify/context';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    console.log(`[${requestId}] 🔍 DEBUG FLOW: Starting step-by-step debugging...`);
    
    // ======================================================================
    // STEP 1: Check Authentication Headers
    // ======================================================================
    console.log(`[${requestId}] STEP 1: Checking authentication headers...`);
    
    const headers = {
      'x-shopify-shop': request.headers.get('x-shopify-shop'),
      'x-shopify-session-token': request.headers.get('x-shopify-session-token'),
      'x-shopify-user-id': request.headers.get('x-shopify-user-id'),
      'authorization': request.headers.get('authorization'),
      'host': request.headers.get('host'),
      'user-agent': request.headers.get('user-agent')
    };
    
    console.log(`[${requestId}] Headers received:`, headers);
    
    // ======================================================================
    // STEP 2: Test Shop Context Extraction
    // ======================================================================
    console.log(`[${requestId}] STEP 2: Testing shop context extraction...`);
    
    const shopContext = getShopContext(request);
    console.log(`[${requestId}] Shop context result:`, shopContext);
    
    if (!shopContext) {
      return NextResponse.json({
        success: false,
        step: 'shop_context',
        error: 'No shop context found',
        headers: headers,
        message: 'This means the request is not coming from Shopify app or session is invalid'
      });
    }
    
    console.log(`[${requestId}] ✅ Shop context found: ${shopContext.shop}`);
    
    // ======================================================================
    // STEP 3: Check shopify_sessions table
    // ======================================================================
    console.log(`[${requestId}] STEP 3: Checking shopify_sessions table...`);
    
    const { data: sessions, error: sessionsError } = await supabase
      .from('shopify_sessions')
      .select('*')
      .eq('shop', shopContext.shop);
    
    console.log(`[${requestId}] Sessions query result:`, {
      error: sessionsError,
      count: sessions?.length || 0,
      sessions: sessions
    });
    
    if (sessionsError) {
      return NextResponse.json({
        success: false,
        step: 'sessions_query',
        error: 'Database error when querying sessions',
        details: sessionsError,
        shopContext: shopContext
      });
    }
    
    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        success: false,
        step: 'sessions_empty',
        error: 'No sessions found in shopify_sessions table',
        shopContext: shopContext,
        message: 'OAuth may not have completed or data was not saved'
      });
    }
    
    console.log(`[${requestId}] ✅ Found ${sessions.length} session(s) in shopify_sessions`);
    
    // ======================================================================
    // STEP 4: Check shops table
    // ======================================================================
    console.log(`[${requestId}] STEP 4: Checking shops table...`);
    
    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .select('*')
      .eq('shop_domain', shopContext.shop);
    
    console.log(`[${requestId}] Shops query result:`, {
      error: shopsError,
      count: shops?.length || 0,
      shops: shops
    });
    
    // ======================================================================
    // STEP 5: Test Vapi provision endpoint simulation
    // ======================================================================
    console.log(`[${requestId}] STEP 5: Simulating Vapi provision endpoint...`);
    
    // Simulate what the Vapi provision endpoint does
    const { data: session, error: sessionError } = await supabase
      .from('shopify_sessions')
      .select('*')
      .eq('shop', shopContext.shop)
      .single();
    
    console.log(`[${requestId}] Vapi provision simulation result:`, {
      error: sessionError,
      session: session
    });
    
    if (sessionError || !session) {
      return NextResponse.json({
        success: false,
        step: 'vapi_simulation',
        error: 'Vapi provision would fail here',
        details: sessionError,
        shopContext: shopContext,
        sessionsFound: sessions?.length || 0
      });
    }
    
    console.log(`[${requestId}] ✅ Vapi provision simulation would succeed`);
    
    // ======================================================================
    // STEP 6: Summary
    // ======================================================================
    console.log(`[${requestId}] STEP 6: Summary of findings...`);
    
    return NextResponse.json({
      success: true,
      step: 'complete',
      summary: {
        shopContext: shopContext,
        sessionsInShopifySessions: sessions?.length || 0,
        shopsInShopsTable: shops?.length || 0,
        vapiProvisionWouldWork: !sessionError && !!session,
        recommendations: [
          sessions?.length === 0 ? 'OAuth needs to be completed' : 'OAuth data exists',
          shops?.length === 0 ? 'shops table is empty (expected)' : 'shops table has data',
          sessionError ? 'Vapi provision would fail' : 'Vapi provision would work'
        ]
      },
      data: {
        shopContext,
        sessions,
        shops,
        session
      }
    });
    
  } catch (error) {
    console.error(`[${requestId}] ❌ DEBUG FLOW ERROR:`, error);
    return NextResponse.json({
      success: false,
      step: 'exception',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
