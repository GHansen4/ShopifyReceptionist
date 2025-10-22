import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/api';
import { vapi } from '@/lib/vapi/client';
import { env } from '@/lib/env';

/**
 * GET /api/vapi/test/connection
 * Tests Vapi API connection by fetching assistant list
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Vapi Test] Testing API connection...');

    // Check if API key is configured
    if (!env.VAPI_API_KEY || env.VAPI_API_KEY === 'your-vapi-api-key') {
      console.log('[Vapi Test] ❌ API key not configured');
      return createSuccessResponse({
        connected: false,
        hasApiKey: false,
        message: 'VAPI_API_KEY not configured',
      });
    }

    console.log('[Vapi Test] ✅ API key present');

    // Test the connection by listing assistants (limit 1)
    const response = await vapi.assistants.list({ limit: 1 });
    
    console.log('[Vapi Test] ✅ Connection successful');

    return createSuccessResponse({
      connected: true,
      hasApiKey: true,
      message: 'Vapi API connection successful',
      assistantCount: response.length || 0,
    });
  } catch (error: any) {
    console.error('[Vapi Test] ❌ Connection failed:', error);

    // Parse error details
    let errorMessage = 'Unknown error';
    if (error.message) {
      errorMessage = error.message;
    } else if (error.toString) {
      errorMessage = error.toString();
    }

    return createSuccessResponse({
      connected: false,
      hasApiKey: true,
      message: `Connection failed: ${errorMessage}`,
      error: errorMessage,
    });
  }
}

