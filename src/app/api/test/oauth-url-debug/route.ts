import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] 🔍 OAUTH URL DEBUG: Checking OAuth URL configuration...`);

  try {
    // Get current environment variables
    const shopifyAppUrl = process.env.SHOPIFY_APP_URL;
    const nextPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    const vercelUrl = process.env.VERCEL_URL;
    const nodeEnv = process.env.NODE_ENV;
    
    // Get the resolved app URL
    let resolvedAppUrl = 'unknown';
    try {
      resolvedAppUrl = env.SHOPIFY_APP_URL;
    } catch (error: any) {
      resolvedAppUrl = `Error: ${error.message}`;
    }

    // Check if we're using Cloudflare tunnel
    const isCloudflareTunnel = shopifyAppUrl?.includes('trycloudflare.com') || 
                               shopifyAppUrl?.includes('ngrok.io') ||
                               shopifyAppUrl?.includes('tunnel');

    // Check if we're using production URL
    const isProductionUrl = shopifyAppUrl?.includes('vercel.app') ||
                           nextPublicAppUrl?.includes('vercel.app');

    const analysis = {
      environment: {
        NODE_ENV: nodeEnv,
        SHOPIFY_APP_URL: shopifyAppUrl,
        NEXT_PUBLIC_APP_URL: nextPublicAppUrl,
        VERCEL_URL: vercelUrl,
        resolvedAppUrl: resolvedAppUrl
      },
      urlType: {
        isCloudflareTunnel,
        isProductionUrl,
        isDevelopment: nodeEnv === 'development'
      },
      oauthCallback: {
        expectedUrl: `${resolvedAppUrl}/api/auth/callback`,
        actualUrl: `${request.url.split('/api')[0]}/api/auth/callback`
      },
      recommendations: []
    };

    // Generate recommendations based on the analysis
    if (isCloudflareTunnel) {
      analysis.recommendations.push('⚠️ Using Cloudflare tunnel - this may cause token issues');
      analysis.recommendations.push('💡 Consider using production URL for OAuth');
    }

    if (isProductionUrl) {
      analysis.recommendations.push('✅ Using production URL - this should work correctly');
    }

    if (analysis.oauthCallback.expectedUrl !== analysis.oauthCallback.actualUrl) {
      analysis.recommendations.push('❌ OAuth callback URL mismatch detected');
      analysis.recommendations.push('🔧 This could cause token validation issues');
    }

    if (analysis.recommendations.length === 0) {
      analysis.recommendations.push('✅ OAuth URL configuration looks correct');
    }

    console.log(`[${requestId}] ✅ OAuth URL analysis complete:`, analysis);

    return NextResponse.json({
      success: true,
      analysis,
      message: 'OAuth URL configuration analyzed'
    });

  } catch (error: any) {
    console.error(`[${requestId}] ❌ Exception during OAuth URL debug:`, error);
    return NextResponse.json({
      success: false,
      error: 'Exception during OAuth URL debug',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}
