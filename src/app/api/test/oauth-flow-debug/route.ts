import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] 🔍 OAUTH FLOW DEBUG: Analyzing OAuth flow configuration...`);

  try {
    // Get environment variables
    const shopifyApiKey = process.env.SHOPIFY_API_KEY;
    const shopifyApiSecret = process.env.SHOPIFY_API_SECRET;
    const shopifyScopes = process.env.SHOPIFY_SCOPES;
    const shopifyAppUrl = process.env.SHOPIFY_APP_URL;
    const nextPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    // Get resolved app URL
    let resolvedAppUrl = 'unknown';
    try {
      resolvedAppUrl = env.SHOPIFY_APP_URL;
    } catch (error: any) {
      resolvedAppUrl = `Error: ${error.message}`;
    }

    // Construct OAuth URLs
    const oauthUrl = `https://shopify-receptionist.vercel.app/api/auth`;
    const callbackUrl = `https://shopify-receptionist.vercel.app/api/auth/callback`;
    
    // Construct Shopify OAuth URL for testing
    const shopDomain = 'always-ai-dev-store.myshopify.com';
    const state = 'test-state-123';
    const shopifyOauthUrl = `https://${shopDomain}/admin/oauth/authorize?client_id=${shopifyApiKey}&scope=${shopifyScopes}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`;

    const analysis = {
      environment: {
        SHOPIFY_API_KEY: shopifyApiKey ? `${shopifyApiKey.substring(0, 10)}...` : 'MISSING',
        SHOPIFY_API_SECRET: shopifyApiSecret ? `${shopifyApiSecret.substring(0, 10)}...` : 'MISSING',
        SHOPIFY_SCOPES: shopifyScopes || 'MISSING',
        SHOPIFY_APP_URL: shopifyAppUrl,
        NEXT_PUBLIC_APP_URL: nextPublicAppUrl,
        resolvedAppUrl: resolvedAppUrl
      },
      oauthUrls: {
        oauthUrl,
        callbackUrl,
        shopifyOauthUrl
      },
      configuration: {
        hasApiKey: !!shopifyApiKey,
        hasApiSecret: !!shopifyApiSecret,
        hasScopes: !!shopifyScopes,
        hasAppUrl: !!shopifyAppUrl,
        allRequired: !!shopifyApiKey && !!shopifyApiSecret && !!shopifyScopes && !!shopifyAppUrl
      }
    };

    // Generate recommendations
    const recommendations = [];
    
    if (!analysis.configuration.hasApiKey) {
      recommendations.push('❌ Missing SHOPIFY_API_KEY');
    }
    
    if (!analysis.configuration.hasApiSecret) {
      recommendations.push('❌ Missing SHOPIFY_API_SECRET');
    }
    
    if (!analysis.configuration.hasScopes) {
      recommendations.push('❌ Missing SHOPIFY_SCOPES');
    }
    
    if (!analysis.configuration.hasAppUrl) {
      recommendations.push('❌ Missing SHOPIFY_APP_URL');
    }
    
    if (analysis.configuration.allRequired) {
      recommendations.push('✅ All required environment variables are present');
      recommendations.push('🔧 OAuth flow should work - check app installation process');
    }

    // Add specific troubleshooting steps
    recommendations.push('📋 TROUBLESHOOTING STEPS:');
    recommendations.push('1. Go to Shopify admin: https://always-ai-dev-store.myshopify.com/admin');
    recommendations.push('2. Check if app is installed in Apps section');
    recommendations.push('3. If not installed, try installing from: ' + oauthUrl);
    recommendations.push('4. If installation fails, check browser console for errors');
    recommendations.push('5. Verify app permissions include: ' + (shopifyScopes || 'read_products'));

    console.log(`[${requestId}] ✅ OAuth flow analysis complete:`, analysis);

    return NextResponse.json({
      success: true,
      analysis,
      recommendations,
      message: 'OAuth flow configuration analyzed'
    });

  } catch (error: any) {
    console.error(`[${requestId}] ❌ Exception during OAuth flow debug:`, error);
    return NextResponse.json({
      success: false,
      error: 'Exception during OAuth flow debug',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}
