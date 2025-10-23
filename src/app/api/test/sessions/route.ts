import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    console.log('[Test Sessions] Checking shopify_sessions table...');
    
    // Check shopify_sessions table
    const { data: sessions, error } = await supabase
      .from('shopify_sessions')
      .select('id, shop, access_token, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Test Sessions] Database error:', error);
      return NextResponse.json({ 
        error: 'Database error', 
        details: error.message 
      }, { status: 500 });
    }

    console.log('[Test Sessions] Found sessions:', sessions?.length || 0);
    
    return NextResponse.json({
      success: true,
      sessions: sessions || [],
      count: sessions?.length || 0,
      message: 'This shows sessions in shopify_sessions table (OAuth data)'
    });

  } catch (error) {
    console.error('[Test Sessions] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
