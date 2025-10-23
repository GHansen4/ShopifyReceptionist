import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    console.log(`[${requestId}] 🔍 SUPABASE DEBUG: Starting comprehensive Supabase debugging...`);
    
    // ======================================================================
    // STEP 1: Check Environment Variables
    // ======================================================================
    console.log(`[${requestId}] STEP 1: Checking Supabase environment variables...`);
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log(`[${requestId}] Environment variables:`, {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      hasServiceRoleKey: !!serviceRoleKey,
      urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING',
      anonKeyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING',
      serviceKeyPreview: serviceRoleKey ? `${serviceRoleKey.substring(0, 20)}...` : 'MISSING'
    });
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        success: false,
        step: 'environment',
        error: 'Missing required Supabase environment variables',
        details: {
          hasUrl: !!supabaseUrl,
          hasAnonKey: !!supabaseAnonKey,
          hasServiceRoleKey: !!serviceRoleKey
        }
      });
    }
    
    console.log(`[${requestId}] ✅ STEP 1 SUCCESS: Environment variables present`);
    
    // ======================================================================
    // STEP 2: Test Regular Supabase Client
    // ======================================================================
    console.log(`[${requestId}] STEP 2: Testing regular Supabase client...`);
    
    try {
      const { data: healthCheck, error: healthError } = await supabase
        .from('shopify_sessions')
        .select('count')
        .limit(1);
      
      console.log(`[${requestId}] Regular client health check:`, {
        error: healthError,
        data: healthCheck
      });
      
      if (healthError) {
        console.error(`[${requestId}] ❌ STEP 2 FAILED: Regular client error:`, healthError);
        return NextResponse.json({
          success: false,
          step: 'regular_client',
          error: 'Regular Supabase client failed',
          details: healthError,
          message: 'This suggests SUPABASE_URL or SUPABASE_ANON_KEY is incorrect'
        });
      }
      
      console.log(`[${requestId}] ✅ STEP 2 SUCCESS: Regular client working`);
    } catch (clientError) {
      console.error(`[${requestId}] ❌ STEP 2 FAILED: Regular client exception:`, clientError);
      return NextResponse.json({
        success: false,
        step: 'regular_client_exception',
        error: 'Regular client threw exception',
        details: clientError instanceof Error ? clientError.message : 'Unknown error'
      });
    }
    
    // ======================================================================
    // STEP 3: Test Admin Supabase Client
    // ======================================================================
    console.log(`[${requestId}] STEP 3: Testing admin Supabase client...`);
    
    try {
      const { data: adminHealthCheck, error: adminHealthError } = await supabaseAdmin
        .from('shopify_sessions')
        .select('count')
        .limit(1);
      
      console.log(`[${requestId}] Admin client health check:`, {
        error: adminHealthError,
        data: adminHealthCheck
      });
      
      if (adminHealthError) {
        console.error(`[${requestId}] ❌ STEP 3 FAILED: Admin client error:`, adminHealthError);
        return NextResponse.json({
          success: false,
          step: 'admin_client',
          error: 'Admin Supabase client failed',
          details: adminHealthError,
          message: 'This suggests SUPABASE_SERVICE_ROLE_KEY is incorrect or missing'
        });
      }
      
      console.log(`[${requestId}] ✅ STEP 3 SUCCESS: Admin client working`);
    } catch (adminClientError) {
      console.error(`[${requestId}] ❌ STEP 3 FAILED: Admin client exception:`, adminClientError);
      return NextResponse.json({
        success: false,
        step: 'admin_client_exception',
        error: 'Admin client threw exception',
        details: adminClientError instanceof Error ? adminClientError.message : 'Unknown error'
      });
    }
    
    // ======================================================================
    // STEP 4: Test Specific Query (what the provision endpoint does)
    // ======================================================================
    console.log(`[${requestId}] STEP 4: Testing specific shop query...`);
    
    const testShop = 'always-ai-dev-store.myshopify.com';
    
    try {
      const { data: sessionData, error: sessionError } = await supabaseAdmin
        .from('shopify_sessions')
        .select('id, shop, access_token')
        .eq('shop', testShop)
        .single();
      
      console.log(`[${requestId}] Specific shop query result:`, {
        error: sessionError,
        data: sessionData,
        shopDomain: testShop
      });
      
      if (sessionError) {
        console.log(`[${requestId}] ⚠️  STEP 4 WARNING: Shop not found (this might be expected if OAuth hasn't completed)`);
        console.log(`[${requestId}] Session error details:`, sessionError);
      } else {
        console.log(`[${requestId}] ✅ STEP 4 SUCCESS: Shop found in sessions`);
      }
    } catch (queryError) {
      console.error(`[${requestId}] ❌ STEP 4 FAILED: Query exception:`, queryError);
      return NextResponse.json({
        success: false,
        step: 'query_exception',
        error: 'Query threw exception',
        details: queryError instanceof Error ? queryError.message : 'Unknown error'
      });
    }
    
    // ======================================================================
    // STEP 5: List All Sessions (if any exist)
    // ======================================================================
    console.log(`[${requestId}] STEP 5: Listing all sessions...`);
    
    try {
      const { data: allSessions, error: allSessionsError } = await supabaseAdmin
        .from('shopify_sessions')
        .select('id, shop, created_at')
        .order('created_at', { ascending: false });
      
      console.log(`[${requestId}] All sessions query result:`, {
        error: allSessionsError,
        count: allSessions?.length || 0,
        sessions: allSessions
      });
      
      if (allSessionsError) {
        console.error(`[${requestId}] ❌ STEP 5 FAILED: Could not list sessions:`, allSessionsError);
      } else {
        console.log(`[${requestId}] ✅ STEP 5 SUCCESS: Found ${allSessions?.length || 0} sessions`);
      }
    } catch (listError) {
      console.error(`[${requestId}] ❌ STEP 5 FAILED: List sessions exception:`, listError);
    }
    
    // ======================================================================
    // SUMMARY
    // ======================================================================
    console.log(`[${requestId}] 🔍 SUPABASE DEBUG COMPLETE`);
    
    return NextResponse.json({
      success: true,
      step: 'complete',
      summary: {
        environment: {
          hasUrl: !!supabaseUrl,
          hasAnonKey: !!supabaseAnonKey,
          hasServiceRoleKey: !!serviceRoleKey
        },
        clients: {
          regularClient: 'tested',
          adminClient: 'tested'
        },
        recommendations: [
          !serviceRoleKey ? 'SUPABASE_SERVICE_ROLE_KEY is missing - this is required for admin operations' : 'Service role key is present',
          'Check Vercel environment variables to ensure all Supabase keys are correct',
          'Verify Supabase project is active and accessible'
        ]
      }
    });
    
  } catch (error) {
    console.error(`[${requestId}] ❌ SUPABASE DEBUG ERROR:`, error);
    return NextResponse.json({
      success: false,
      step: 'exception',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
