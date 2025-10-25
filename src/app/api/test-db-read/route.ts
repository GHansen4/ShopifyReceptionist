import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    console.log('[Test DB Read] Starting shops read test...');
    
    const supabase = getSupabaseAdmin();
    
    // Read all shops from database
    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .select('id, shop_domain, shop_name, email, vapi_assistant_id, access_token, access_token_offline, created_at')
      .order('created_at', { ascending: false });
    
    if (shopsError) {
      console.error('[Test DB Read] Shops read error:', shopsError);
      return NextResponse.json({ 
        success: false, 
        error: 'Shops read failed',
        details: shopsError.message,
        code: shopsError.code
      }, { status: 500 });
    }
    
    console.log('[Test DB Read] ✅ Shops read successfully:', shops?.length || 0, 'shops found');
    
    // Also read sessions to check for access tokens
    const { data: sessions, error: sessionsError } = await supabase
      .from('shopify_sessions')
      .select('id, shop, access_token, is_online, created_at')
      .order('created_at', { ascending: false });
    
    if (sessionsError) {
      console.error('[Test DB Read] Sessions read error:', sessionsError);
    }
    
    return NextResponse.json({
      success: true,
      message: `Found ${shops?.length || 0} shops and ${sessions?.length || 0} sessions`,
      shops: shops || [],
      sessions: sessions || [],
      summary: {
        totalShops: shops?.length || 0,
        totalSessions: sessions?.length || 0,
        shopsWithTokens: shops?.filter(s => s.access_token).length || 0,
        sessionsWithTokens: sessions?.filter(s => s.access_token).length || 0
      }
    });
    
  } catch (error) {
    console.error('[Test DB Read] Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
