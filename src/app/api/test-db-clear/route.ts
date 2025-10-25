import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('[Test DB Clear] Starting test data cleanup...');
    
    const supabase = getSupabaseAdmin();
    
    // Clear test shops (those with test domains)
    const { error: shopsError } = await supabase
      .from('shops')
      .delete()
      .like('shop_domain', '%test%');
    
    if (shopsError) {
      console.error('[Test DB Clear] Shops clear error:', shopsError);
      return NextResponse.json({ 
        success: false, 
        error: 'Shops clear failed',
        details: shopsError.message,
        code: shopsError.code
      }, { status: 500 });
    }
    
    // Clear test sessions (those with test shops)
    const { error: sessionsError } = await supabase
      .from('shopify_sessions')
      .delete()
      .like('shop', '%test%');
    
    if (sessionsError) {
      console.error('[Test DB Clear] Sessions clear error:', sessionsError);
      return NextResponse.json({ 
        success: false, 
        error: 'Sessions clear failed',
        details: sessionsError.message,
        code: sessionsError.code
      }, { status: 500 });
    }
    
    console.log('[Test DB Clear] ✅ Test data cleared successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Test data cleared successfully',
      cleared: {
        shops: 'test domains',
        sessions: 'test shops'
      }
    });
    
  } catch (error) {
    console.error('[Test DB Clear] Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
