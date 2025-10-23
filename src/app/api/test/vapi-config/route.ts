import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[Vapi Config] Checking Vapi configuration...');
    
    // Check all Vapi-related environment variables
    const config = {
      VAPI_API_KEY: process.env.VAPI_API_KEY,
      VAPI_PUBLIC_KEY: process.env.VAPI_PUBLIC_KEY,
      VAPI_PRIVATE_KEY: process.env.VAPI_PRIVATE_KEY,
      VAPI_TEST_PHONE_NUMBER: process.env.VAPI_TEST_PHONE_NUMBER,
    };
    
    const hasApiKey = !!config.VAPI_API_KEY;
    const hasPublicKey = !!config.VAPI_PUBLIC_KEY;
    const hasPrivateKey = !!config.VAPI_PRIVATE_KEY;
    const hasTestPhone = !!config.VAPI_TEST_PHONE_NUMBER;
    
    console.log('[Vapi Config] Environment check:', {
      hasApiKey,
      hasPublicKey,
      hasPrivateKey,
      hasTestPhone
    });
    
    return NextResponse.json({
      success: true,
      configuration: {
        hasApiKey,
        hasPublicKey,
        hasPrivateKey,
        hasTestPhone,
        allRequired: hasApiKey || hasPrivateKey
      },
      environment: {
        VAPI_API_KEY: hasApiKey ? `${config.VAPI_API_KEY!.substring(0, 20)}...` : 'MISSING',
        VAPI_PUBLIC_KEY: hasPublicKey ? `${config.VAPI_PUBLIC_KEY!.substring(0, 20)}...` : 'MISSING',
        VAPI_PRIVATE_KEY: hasPrivateKey ? `${config.VAPI_PRIVATE_KEY!.substring(0, 20)}...` : 'MISSING',
        VAPI_TEST_PHONE_NUMBER: hasTestPhone ? config.VAPI_TEST_PHONE_NUMBER : 'MISSING'
      },
      instructions: {
        missing: !hasApiKey && !hasPrivateKey ? [
          'VAPI_API_KEY or VAPI_PRIVATE_KEY is missing from Vercel environment variables',
          'Go to Vercel Dashboard → Project Settings → Environment Variables',
          'Add VAPI_API_KEY with your Vapi API key value',
          'Or add VAPI_PRIVATE_KEY if using private key instead',
          'Redeploy your Vercel project after adding the environment variable'
        ] : [],
        nextSteps: hasApiKey || hasPrivateKey ? [
          'Vapi API key is configured correctly',
          'Test the authentication with X-Vapi-Secret header',
          'Configure Vapi assistant to use the correct endpoint'
        ] : [
          'Configure VAPI_API_KEY environment variable first'
        ]
      }
    });

  } catch (error) {
    console.error('[Vapi Config] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
