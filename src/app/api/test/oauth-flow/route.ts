import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[OAuth Flow Test] Checking OAuth configuration...');
    
    // Check if the OAuth flow is properly configured
    const oauthConfig = {
      SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
      SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET,
      SHOPIFY_SCOPES: process.env.SHOPIFY_SCOPES,
      SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    };
    
    const hasApiKey = !!oauthConfig.SHOPIFY_API_KEY;
    const hasApiSecret = !!oauthConfig.SHOPIFY_API_SECRET;
    const hasScopes = !!oauthConfig.SHOPIFY_SCOPES;
    const hasAppUrl = !!oauthConfig.SHOPIFY_APP_URL || !!oauthConfig.NEXT_PUBLIC_APP_URL;
    
    console.log('[OAuth Flow Test] Configuration check:', {
      hasApiKey,
      hasApiSecret,
      hasScopes,
      hasAppUrl
    });
    
    return NextResponse.json({
      success: true,
      oauthReady: hasApiKey && hasApiSecret && hasScopes && hasAppUrl,
      configuration: {
        hasApiKey,
        hasApiSecret,
        hasScopes,
        hasAppUrl,
        allRequired: hasApiKey && hasApiSecret && hasScopes && hasAppUrl
      },
      environment: {
        SHOPIFY_API_KEY: hasApiKey ? `${oauthConfig.SHOPIFY_API_KEY!.substring(0, 20)}...` : 'MISSING',
        SHOPIFY_API_SECRET: hasApiSecret ? `${oauthConfig.SHOPIFY_API_SECRET!.substring(0, 20)}...` : 'MISSING',
        SHOPIFY_SCOPES: hasScopes ? oauthConfig.SHOPIFY_SCOPES : 'MISSING',
        SHOPIFY_APP_URL: hasAppUrl ? (oauthConfig.SHOPIFY_APP_URL || oauthConfig.NEXT_PUBLIC_APP_URL) : 'MISSING'
      },
      instructions: {
        ready: hasApiKey && hasApiSecret && hasScopes && hasAppUrl ? [
          '✅ OAuth configuration is ready',
          'Run: shopify app dev',
          'Press "p" to preview in development store',
          'This will trigger OAuth and create a shop record',
          'Check /api/test/shops to see the new shop'
        ] : [
          '❌ OAuth configuration is incomplete',
          'Missing required environment variables',
          'Check Vercel environment variables'
        ]
      }
    });

  } catch (error) {
    console.error('[OAuth Flow Test] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
