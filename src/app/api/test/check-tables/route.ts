import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    console.log(`[${requestId}] 🔍 Testing database table access...`);
    
    const results = {
      shopify_sessions: { exists: false, error: null, sampleData: null },
      shops: { exists: false, error: null, sampleData: null },
      recommendations: []
    };
    
    // ======================================================================
    // Test shopify_sessions table
    // ======================================================================
    console.log(`[${requestId}] Testing shopify_sessions table...`);
    
    try {
      const { data: sessionData, error: sessionError } = await supabaseAdmin
        .from('shopify_sessions')
        .select('*')
        .limit(1);
      
      if (sessionError) {
        console.log(`[${requestId}] shopify_sessions error:`, sessionError);
        results.shopify_sessions.error = sessionError.message;
      } else {
        console.log(`[${requestId}] ✅ shopify_sessions accessible, found ${sessionData?.length || 0} records`);
        results.shopify_sessions.exists = true;
        results.shopify_sessions.sampleData = sessionData?.[0] || null;
      }
    } catch (sessionException) {
      console.error(`[${requestId}] shopify_sessions exception:`, sessionException);
      results.shopify_sessions.error = sessionException instanceof Error ? sessionException.message : 'Unknown error';
    }
    
    // ======================================================================
    // Test shops table
    // ======================================================================
    console.log(`[${requestId}] Testing shops table...`);
    
    try {
      const { data: shopsData, error: shopsError } = await supabaseAdmin
        .from('shops')
        .select('*')
        .limit(1);
      
      if (shopsError) {
        console.log(`[${requestId}] shops error:`, shopsError);
        results.shops.error = shopsError.message;
      } else {
        console.log(`[${requestId}] ✅ shops accessible, found ${shopsData?.length || 0} records`);
        results.shops.exists = true;
        results.shops.sampleData = shopsData?.[0] || null;
      }
    } catch (shopsException) {
      console.error(`[${requestId}] shops exception:`, shopsException);
      results.shops.error = shopsException instanceof Error ? shopsException.message : 'Unknown error';
    }
    
    // ======================================================================
    // Generate recommendations
    // ======================================================================
    if (results.shopify_sessions.exists) {
      results.recommendations.push('✅ shopify_sessions table exists and is accessible');
    } else {
      results.recommendations.push('❌ shopify_sessions table not accessible - OAuth may not have completed');
    }
    
    if (results.shops.exists) {
      results.recommendations.push('✅ shops table exists and is accessible');
      results.recommendations.push('💡 Use shops table for storing Vapi provisioning data');
    } else {
      results.recommendations.push('❌ shops table does not exist');
      results.recommendations.push('💡 Need to create shops table or use alternative storage');
    }
    
    console.log(`[${requestId}] Database check complete:`, results);
    
    return NextResponse.json({
      success: true,
      results,
      summary: {
        shopify_sessions_accessible: results.shopify_sessions.exists,
        shops_table_accessible: results.shops.exists,
        next_steps: results.recommendations
      }
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
