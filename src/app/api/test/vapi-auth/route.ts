import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';
  
  try {
    console.log('[Vapi Auth Test] Checking Vapi authentication configuration...');

    const vapiApiKey = process.env.VAPI_API_KEY;
    const vapiPublicKey = process.env.VAPI_PUBLIC_KEY;

    const headers = {
      'x-vapi-secret': request.headers.get('x-vapi-secret') ? 'present' : 'missing',
      'x-api-key': request.headers.get('x-api-key') ? 'present' : 'missing',
      'authorization': request.headers.get('authorization') ? 'present' : 'missing'
    };

    const config = {
      hasApiKey: !!vapiApiKey,
      hasPublicKey: !!vapiPublicKey,
      allRequired: !!vapiApiKey, // Only VAPI_API_KEY is required
    };

    const environment = {
      VAPI_API_KEY: vapiApiKey ? `${vapiApiKey.substring(0, 20)}...` : 'MISSING',
      VAPI_PUBLIC_KEY: vapiPublicKey ? `${vapiPublicKey.substring(0, 20)}...` : 'MISSING',
    };

    const instructions: string[] = [];
    if (!config.hasApiKey) instructions.push('Missing VAPI_API_KEY (REQUIRED)');
    if (!config.hasPublicKey) instructions.push('Missing VAPI_PUBLIC_KEY (optional)');

    return NextResponse.json({
      success: true,
      configuration: config,
      environment,
      headers,
      instructions: {
        missing: instructions.filter(i => i.includes('Missing')),
        nextSteps: instructions.filter(i => !i.includes('Missing')),
        ready: instructions.length === 0 ? ['Vapi authentication is configured.'] : []
      },
      authentication: {
        expectedKey: vapiApiKey ? `${vapiApiKey.substring(0, 20)}...` : 'MISSING',
        receivedHeaders: headers,
        authenticationWorking: config.hasApiKey && (headers['x-vapi-secret'] === 'present' || headers['x-api-key'] === 'present' || headers['authorization'] === 'present')
      }
    });

  } catch (error: any) {
    console.error('[Vapi Auth Test] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message,
      stack: isDev ? error.stack : undefined,
    }, { status: 500 });
  }
}
