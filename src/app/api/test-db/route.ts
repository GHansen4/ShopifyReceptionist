import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    console.log('[Test DB] Testing database connection...');
    
    // Test if we can query the shops table
    const { data: shops, error: shopsError } = await supabaseAdmin
      .from('shops')
      .select('*')
      .limit(1);
    
    if (shopsError) {
      console.error('[Test DB] Shops table error:', shopsError);
      return NextResponse.json({ 
        success: false, 
        error: 'Shops table error',
        details: shopsError.message 
      }, { status: 500 });
    }
    
    // Test if we can query the shopify_sessions table
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('shopify_sessions')
      .select('*')
      .limit(1);
    
    if (sessionsError) {
      console.error('[Test DB] Sessions table error:', sessionsError);
      return NextResponse.json({ 
        success: false, 
        error: 'Sessions table error',
        details: sessionsError.message 
      }, { status: 500 });
    }
    
    console.log('[Test DB] ✅ Database connection successful');
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      shopsCount: shops?.length || 0,
      sessionsCount: sessions?.length || 0
    });
    
  } catch (error) {
    console.error('[Test DB] Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
