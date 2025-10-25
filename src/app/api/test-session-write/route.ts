import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('[Test Session Write] Starting session insert test...');
    
    const body = await request.json();
    console.log('[Test Session Write] Request body:', body);
    
    const supabase = getSupabaseAdmin();
    
    // Insert session into database
    const { data, error } = await supabase
      .from('shopify_sessions')
      .insert([{
        id: body.id,
        shop: body.shop,
        state: body.state,
        is_online: body.is_online,
        scope: body.scope,
        expires: body.expires,
        access_token: body.access_token,
        online_access_info: body.online_access_info,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      console.error('[Test Session Write] Insert error:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Session insert failed',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }
    
    console.log('[Test Session Write] ✅ Session inserted successfully:', data);
    
    return NextResponse.json({
      success: true,
      message: 'Session added to database successfully',
      data: data
    });
    
  } catch (error) {
    console.error('[Test Session Write] Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
