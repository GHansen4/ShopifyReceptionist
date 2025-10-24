import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

/**
 * Debug endpoint to check shop mapping in database
 * 
 * GET /api/debug/shop-mapping?assistantId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const assistantId = searchParams.get('assistantId');

    if (!assistantId) {
      return NextResponse.json({ 
        error: 'assistantId parameter is required' 
      }, { status: 400 });
    }

    console.log('[Debug] Checking shop mapping for assistant ID:', assistantId);

    // Check shops table
    const { data: shops, error: shopsError } = await supabaseAdmin
      .from('shops')
      .select('id, shop_domain, vapi_assistant_id, access_token, access_token_offline')
      .eq('vapi_assistant_id', assistantId);

    // Check shopify_sessions table
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('shopify_sessions')
      .select('id, shop, access_token, is_online')
      .limit(10);

    return NextResponse.json({
      assistantId,
      shops: {
        data: shops,
        error: shopsError,
        count: shops?.length || 0
      },
      sessions: {
        data: sessions,
        error: sessionsError,
        count: sessions?.length || 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Debug] Shop mapping check error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
