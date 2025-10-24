export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  const supabase = getServerSupabase();
  
  try {
    console.log('[Test Shops] Fetching all shops from database...');
    
    // Check environment variables first
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('[Test Shops] Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      hasServiceRoleKey: !!serviceRoleKey,
      supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING'
    });
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ 
        error: 'Supabase configuration missing',
        details: {
          hasSupabaseUrl: !!supabaseUrl,
          hasAnonKey: !!supabaseAnonKey,
          hasServiceRoleKey: !!serviceRoleKey
        }
      }, { status: 500 });
    }
    
    // Try to fetch shops using regular client
    const { data: shops, error } = await supabase
      .from('shops')
      .select('id, shop_domain, shop_name, created_at, subscription_status')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Test Shops] Database error:', error);
      return NextResponse.json({ 
        error: 'Database error', 
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 });
    }

    console.log('[Test Shops] Found shops:', shops?.length || 0);
    
    return NextResponse.json({
      success: true,
      shops: shops || [],
      count: shops?.length || 0,
      environment: {
        hasSupabaseUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey,
        hasServiceRoleKey: !!serviceRoleKey
      }
    });

  } catch (error) {
    console.error('[Test Shops] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
