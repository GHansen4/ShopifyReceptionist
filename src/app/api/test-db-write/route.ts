import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('[Test DB Write] Starting shop insert test...');
    
    const body = await request.json();
    console.log('[Test DB Write] Request body:', body);
    
    const supabase = getSupabaseAdmin();
    
    // Insert shop into database
    const { data, error } = await supabase
      .from('shops')
      .insert([body])
      .select()
      .single();
    
    if (error) {
      console.error('[Test DB Write] Insert error:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Insert failed',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }
    
    console.log('[Test DB Write] ✅ Shop inserted successfully:', data);
    
    return NextResponse.json({
      success: true,
      message: 'Shop added to database successfully',
      data: data
    });
    
  } catch (error) {
    console.error('[Test DB Write] Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
