import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    console.log('[Test Shops] Fetching all shops from database...');
    
    // Fetch all shops from the database
    const { data: shops, error } = await supabaseAdmin
      .from('shops')
      .select('id, shop_domain, shop_name, created_at, subscription_status')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Test Shops] Database error:', error);
      return NextResponse.json({ 
        error: 'Database error', 
        details: error.message 
      }, { status: 500 });
    }

    console.log('[Test Shops] Found shops:', shops?.length || 0);
    
    return NextResponse.json({
      success: true,
      shops: shops || [],
      count: shops?.length || 0
    });

  } catch (error) {
    console.error('[Test Shops] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
