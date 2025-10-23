import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    console.log(`[${requestId}] 🔍 Simple database check...`);
    
    // Test shopify_sessions table
    console.log(`[${requestId}] Testing shopify_sessions table...`);
    
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('shopify_sessions')
      .select('shop, created_at')
      .limit(1);
    
    if (sessionError) {
      console.log(`[${requestId}] shopify_sessions error:`, sessionError);
      return NextResponse.json({
        success: false,
        error: 'shopify_sessions table error',
        details: sessionError,
        message: 'This suggests the table exists but has access issues'
      });
    }
    
    console.log(`[${requestId}] ✅ shopify_sessions accessible, found ${sessionData?.length || 0} records`);
    
    return NextResponse.json({
      success: true,
      message: 'shopify_sessions table is accessible',
      recordCount: sessionData?.length || 0,
      sampleData: sessionData?.[0] || null
    });
    
  } catch (error) {
    console.error(`[${requestId}] ❌ Simple check error:`, error);
    return NextResponse.json({
      success: false,
      error: 'Exception during simple check',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
