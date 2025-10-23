import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

/**
 * Check shops table structure and data
 */
export async function GET() {
  try {
    console.log('[Shops Debug] Checking shops table...');
    
    // Check table structure
    const { data: shops, error: shopsError } = await supabaseAdmin
      .from('shops')
      .select('*')
      .limit(5);
    
    console.log('[Shops Debug] Shops data:', { shops, shopsError });
    
    // Check for any shops with vapi_assistant_id
    const { data: shopsWithVapi, error: vapiError } = await supabaseAdmin
      .from('shops')
      .select('shop_domain, vapi_assistant_id, access_token')
      .not('vapi_assistant_id', 'is', null);
    
    console.log('[Shops Debug] Shops with Vapi assistant ID:', { shopsWithVapi, vapiError });
    
    return NextResponse.json({
      success: true,
      shops: shops || [],
      shopsWithVapi: shopsWithVapi || [],
      errors: {
        shopsError: shopsError?.message,
        vapiError: vapiError?.message
      },
      totalShops: shops?.length || 0,
      shopsWithVapiCount: shopsWithVapi?.length || 0
    });
    
  } catch (error) {
    console.error('[Shops Debug] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
