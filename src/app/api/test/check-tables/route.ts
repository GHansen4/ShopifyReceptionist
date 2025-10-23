import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    console.log(`[${requestId}] 🔍 Checking existing database tables...`);
    
    // Check what tables exist
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error(`[${requestId}] ❌ Failed to list tables:`, tablesError);
      return NextResponse.json({
        success: false,
        error: 'Failed to list tables',
        details: tablesError
      });
    }
    
    console.log(`[${requestId}] Found tables:`, tables);
    
    // Check shopify_sessions table structure
    const { data: sessionColumns, error: sessionError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'shopify_sessions')
      .eq('table_schema', 'public');
    
    if (sessionError) {
      console.error(`[${requestId}] ❌ Failed to get shopify_sessions columns:`, sessionError);
    } else {
      console.log(`[${requestId}] shopify_sessions columns:`, sessionColumns);
    }
    
    // Check if shops table exists
    const { data: shopsColumns, error: shopsError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'shops')
      .eq('table_schema', 'public');
    
    if (shopsError) {
      console.log(`[${requestId}] shops table doesn't exist or no access:`, shopsError.message);
    } else {
      console.log(`[${requestId}] shops table columns:`, shopsColumns);
    }
    
    return NextResponse.json({
      success: true,
      tables: tables?.map(t => t.table_name) || [],
      shopify_sessions_columns: sessionColumns || [],
      shops_table_exists: !shopsError,
      shops_columns: shopsColumns || [],
      recommendations: [
        'shopify_sessions has fixed schema from Shopify OAuth',
        'Need to create separate table for Vapi data or use existing shops table',
        'Check if shops table exists and has proper columns'
      ]
    });
    
  } catch (error) {
    console.error(`[${requestId}] ❌ Error checking tables:`, error);
    return NextResponse.json({
      success: false,
      error: 'Exception during table check',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
