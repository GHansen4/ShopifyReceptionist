import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to test Vapi functions with sample data
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Vapi Debug] Testing Vapi functions endpoint...');
    
    // Test the body parsing fix
    const rawBody = await request.text();
    console.log('[Vapi Debug] Raw body length:', rawBody.length);
    
    const body = JSON.parse(rawBody);
    console.log('[Vapi Debug] Parsed body keys:', Object.keys(body || {}));
    
    // Test assistant ID extraction
    const assistantId = body?.assistantId || body?.assistant_id || body?.assistant?.id;
    console.log('[Vapi Debug] Extracted assistant ID:', assistantId);
    
    // Test shop lookup
    if (assistantId) {
      const { supabaseAdmin } = await import('@/lib/supabase/client');
      const { data, error } = await supabaseAdmin
        .from('shops')
        .select('shop_domain, access_token, vapi_assistant_id')
        .eq('vapi_assistant_id', assistantId)
        .single();
      
      console.log('[Vapi Debug] Shop lookup result:', { data, error });
      
      return NextResponse.json({
        success: true,
        assistantId,
        shopData: data,
        error: error?.message,
        bodyKeys: Object.keys(body || {}),
        bodyStructure: {
          hasAssistant: !!body?.assistant,
          hasAssistantId: !!body?.assistantId,
          hasAssistant_id: !!body?.assistant_id,
          assistantKeys: body?.assistant ? Object.keys(body.assistant) : 'no assistant object'
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'No assistant ID found',
        bodyKeys: Object.keys(body || {}),
        bodyStructure: {
          hasAssistant: !!body?.assistant,
          hasAssistantId: !!body?.assistantId,
          hasAssistant_id: !!body?.assistant_id,
          assistantKeys: body?.assistant ? Object.keys(body.assistant) : 'no assistant object'
        }
      });
    }
    
  } catch (error) {
    console.error('[Vapi Debug] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Vapi Functions Debug Endpoint',
    usage: 'POST with sample Vapi request body to test assistant ID extraction'
  });
}
