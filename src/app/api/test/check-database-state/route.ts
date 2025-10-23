import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] 🔍 CHECK DATABASE STATE: Analyzing database contents...`);

  try {
    const targetShop = 'always-ai-dev-store.myshopify.com';
    
    // Check shopify_sessions table
    console.log(`[${requestId}] 🔍 Checking shopify_sessions table...`);
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('shopify_sessions')
      .select('*')
      .eq('shop', targetShop);

    console.log(`[${requestId}] shopify_sessions result:`, {
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

    console.log(`[${requestId}] shops result:`, {
      error: shopsError,
      count: shops?.length || 0,
      shops: shops
    });

    // Check all sessions (not just target shop)
    console.log(`[${requestId}] 🔍 Checking all sessions...`);
    const { data: allSessions, error: allSessionsError } = await supabaseAdmin
      .from('shopify_sessions')
      .select('shop, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    console.log(`[${requestId}] all sessions result:`, {
      error: allSessionsError,
      count: allSessions?.length || 0,
      sessions: allSessions
    });

    // Check all shops (not just target shop)
    console.log(`[${requestId}] 🔍 Checking all shops...`);
    const { data: allShops, error: allShopsError } = await supabaseAdmin
      .from('shops')
      .select('shop_domain, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    console.log(`[${requestId}] all shops result:`, {
      error: allShopsError,
      count: allShops?.length || 0,
      shops: allShops
    });

    const analysis = {
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
      allSessions: {
        error: allSessionsError,
        count: allSessions?.length || 0,
        sessions: allSessions?.map(s => ({
          shop: s.shop,
          created_at: s.created_at
        })) || []
      },
      allShops: {
        error: allShopsError,
        count: allShops?.length || 0,
        shops: allShops?.map(s => ({
          shop_domain: s.shop_domain,
          created_at: s.created_at
        })) || []
      }
    };

    // Generate recommendations
    const recommendations = [];
    
    if (analysis.shopify_sessions.count === 0) {
      recommendations.push('❌ No sessions found in shopify_sessions table');
      recommendations.push('🔧 App needs to be reinstalled to create a new session');
    }
    
    if (analysis.shops.count === 0) {
      recommendations.push('❌ No shops found in shops table');
      recommendations.push('🔧 OAuth callback may not be working properly');
    }
    
    if (analysis.allSessions.count > 0) {
      recommendations.push(`💡 Found ${analysis.allSessions.count} sessions in database (other shops)`);
    }
    
    if (analysis.allShops.count > 0) {
      recommendations.push(`💡 Found ${analysis.allShops.count} shops in database (other shops)`);
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Database contains expected data');
    }

    console.log(`[${requestId}] ✅ Database state analysis complete:`, analysis);

    return NextResponse.json({
      success: true,
      analysis,
      recommendations,
      message: 'Database state analyzed'
    });

  } catch (error: any) {
    console.error(`[${requestId}] ❌ Exception during database state check:`, error);
    return NextResponse.json({
      success: false,
      error: 'Exception during database state check',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}
