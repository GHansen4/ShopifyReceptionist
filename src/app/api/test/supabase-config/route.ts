import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[Supabase Config] Checking Supabase configuration...');
    
    // Check all Supabase-related environment variables
    const config = {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
    
    const hasUrl = !!config.SUPABASE_URL;
    const hasAnonKey = !!config.SUPABASE_ANON_KEY;
    const hasServiceRoleKey = !!config.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('[Supabase Config] Environment check:', {
      hasUrl,
      hasAnonKey,
      hasServiceRoleKey,
      urlPreview: config.SUPABASE_URL ? `${config.SUPABASE_URL.substring(0, 30)}...` : 'MISSING'
    });
    
    // Test Supabase connection if we have the required keys
    let connectionTest = null;
    if (hasUrl && hasAnonKey) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_ANON_KEY!);
        
        // Test connection by trying to fetch from shops table
        const { data, error } = await supabase
          .from('shops')
          .select('id, shop_domain')
          .limit(1);
        
        if (error) {
          connectionTest = {
            success: false,
            error: error.message,
            code: error.code,
            hint: error.hint
          };
        } else {
          connectionTest = {
            success: true,
            shopsFound: data?.length || 0,
            message: 'Connection successful'
          };
        }
      } catch (error) {
        connectionTest = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      configuration: {
        hasUrl,
        hasAnonKey,
        hasServiceRoleKey,
        allRequired: hasUrl && hasAnonKey,
        adminRequired: hasServiceRoleKey
      },
      environment: {
        SUPABASE_URL: hasUrl ? `${config.SUPABASE_URL!.substring(0, 30)}...` : 'MISSING',
        SUPABASE_ANON_KEY: hasAnonKey ? `${config.SUPABASE_ANON_KEY!.substring(0, 20)}...` : 'MISSING',
        SUPABASE_SERVICE_ROLE_KEY: hasServiceRoleKey ? `${config.SUPABASE_SERVICE_ROLE_KEY!.substring(0, 20)}...` : 'MISSING'
      },
      connectionTest,
      instructions: {
        missing: !hasUrl || !hasAnonKey ? [
          'Go to your Supabase project dashboard',
          'Navigate to Settings → API',
          'Copy the Project URL and anon public key',
          'Add these to Vercel environment variables:',
          '  - SUPABASE_URL',
          '  - SUPABASE_ANON_KEY',
          '  - SUPABASE_SERVICE_ROLE_KEY (for admin operations)',
          'Redeploy your Vercel project'
        ] : [],
        nextSteps: hasUrl && hasAnonKey ? [
          'Supabase is configured correctly',
          'Test the shop-specific endpoint with a real shop ID',
          'Check if shops exist in the database'
        ] : [
          'Configure Supabase environment variables first'
        ]
      }
    });

  } catch (error) {
    console.error('[Supabase Config] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
