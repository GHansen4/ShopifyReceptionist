import { NextRequest, NextResponse } from 'next/server';

/**
 * Test API route to debug environment variables
 * GET /api/test-env
 */
export async function GET(request: NextRequest) {
  try {
    console.log('=== ENVIRONMENT VARIABLES DEBUG ===');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('VERCEL:', process.env.VERCEL);
    console.log('VERCEL_ENV:', process.env.VERCEL_ENV);
    console.log('VERCEL_URL:', process.env.VERCEL_URL);
    
    console.log('\n=== NEXT_PUBLIC VARIABLES ===');
    const nextPublicVars = Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_'));
    console.log('All NEXT_PUBLIC vars:', nextPublicVars);
    
    console.log('\n=== SPECIFIC VARIABLES ===');
    console.log('NEXT_PUBLIC_SHOPIFY_API_KEY:', process.env.NEXT_PUBLIC_SHOPIFY_API_KEY);
    console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
    console.log('SHOPIFY_API_KEY:', process.env.SHOPIFY_API_KEY);
    console.log('SHOPIFY_API_SECRET:', process.env.SHOPIFY_API_SECRET ? 'SET' : 'NOT SET');
    
    console.log('\n=== ALL ENVIRONMENT VARIABLES ===');
    const allEnvVars = Object.keys(process.env).sort();
    console.log('Total env vars:', allEnvVars.length);
    console.log('All env vars:', allEnvVars);
    
    return NextResponse.json({
      success: true,
      debug: {
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.VERCEL,
        vercelEnv: process.env.VERCEL_ENV,
        vercelUrl: process.env.VERCEL_URL,
        nextPublicVars: nextPublicVars,
        specificVars: {
          NEXT_PUBLIC_SHOPIFY_API_KEY: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
          SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
          SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET ? 'SET' : 'NOT SET',
        },
        totalEnvVars: allEnvVars.length,
        allEnvVars: allEnvVars,
      }
    });
    
  } catch (error) {
    console.error('Error in test-env route:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
