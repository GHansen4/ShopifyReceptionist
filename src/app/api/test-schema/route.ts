import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    console.log('[Test Schema] Testing database schema...');
    
    // Test if we can query the shops table structure
    const { data: shops, error: shopsError } = await supabaseAdmin
      .from('shops')
      .select('id, shop_domain, shop_name')
      .limit(1);
    
    if (shopsError) {
      console.error('[Test Schema] Shops table error:', shopsError);
      return NextResponse.json({ 
        success: false, 
        error: 'Shops table error',
        details: shopsError.message,
        code: shopsError.code
      }, { status: 500 });
    }
    
    // Test if we can query the shopify_sessions table structure
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('shopify_sessions')
      .select('id, shop, is_online')
      .limit(1);
    
    if (sessionsError) {
      console.error('[Test Schema] Sessions table error:', sessionsError);
      return NextResponse.json({ 
        success: false, 
        error: 'Sessions table error',
        details: sessionsError.message,
        code: sessionsError.code
      }, { status: 500 });
    }
    
    console.log('[Test Schema] ✅ Database schema is working');
    
    return NextResponse.json({
      success: true,
      message: 'Database schema is working correctly',
      shopsColumns: shops?.length > 0 ? Object.keys(shops[0]) : [],
      sessionsColumns: sessions?.length > 0 ? Object.keys(sessions[0]) : [],
      shopsCount: shops?.length || 0,
      sessionsCount: sessions?.length || 0
    });
    
  } catch (error) {
    console.error('[Test Schema] Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
