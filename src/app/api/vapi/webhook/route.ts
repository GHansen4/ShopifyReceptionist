import { NextResponse } from 'next/server';

// Ensure Node.js runtime for this sensitive route
export const runtime = 'nodejs';

/**
 * Vapi Webhook Endpoint
 * 
 * Handles conversation/call lifecycle events from Vapi:
 * - conversation-update
 * - call.started
 * - call.ended
 * - transcript.available
 * - etc.
 * 
 * DO NOT attempt product lookups here - those go to /api/vapi/functions
 */
export async function POST(req: Request) {
  try {
    // ======================================================================
    // Read raw body ONCE for signature verification and JSON parsing
    // ======================================================================
    const raw = await req.text();
    
    if (!raw) {
      console.error('[Vapi Webhook] Empty request body');
      return NextResponse.json({ success: false, error: 'EMPTY_BODY' }, { status: 400 });
    }

    // Parse JSON from the same raw string
    let body: any = {};
    try {
      body = JSON.parse(raw);
    } catch (parseError) {
      console.error('[Vapi Webhook] JSON parse error:', parseError);
      return NextResponse.json({ success: false, error: 'INVALID_JSON' }, { status: 400 });
    }

    // ======================================================================
    // Optional: Verify Vapi signature
    // ======================================================================
    if (process.env.VAPI_WEBHOOK_SECRET) {
      // TODO: Implement signature verification if needed
      // const signature = req.headers.get('x-vapi-signature');
      // const isValid = verifyVapiSignature(raw, signature);
      // if (!isValid) {
      //   return NextResponse.json({ success: false, error: 'INVALID_SIGNATURE' }, { status: 401 });
      // }
    }

    // ======================================================================
    // Process webhook events
    // ======================================================================
    const eventType = body?.type || body?.message?.type || 'unknown';
    const callId = body?.call?.id || body?.callId;
    const assistantId = body?.assistant?.id || body?.assistantId;

    console.log('[Vapi Webhook] Received event:', {
      type: eventType,
      callId: callId,
      assistantId: assistantId,
      timestamp: new Date().toISOString()
    });

    // Handle different event types
    switch (eventType) {
      case 'conversation-update':
        await handleConversationUpdate(body);
        break;

      case 'call.started':
        await handleCallStarted(body);
        break;

      case 'call.ended':
        await handleCallEnded(body);
        break;

      case 'transcript.available':
        await handleTranscriptAvailable(body);
        break;

      case 'status-update':
        await handleStatusUpdate(body);
        break;

      case 'speech-update':
        await handleSpeechUpdate(body);
        break;

      default:
        console.log('[Vapi Webhook] Unhandled event type:', eventType);
    }

    return NextResponse.json({ 
      success: true, 
      eventType: eventType,
      processed: true 
    });

  } catch (error: any) {
    console.error('[Vapi Webhook] Handler error:', error?.message || error);
    return NextResponse.json({ 
      success: false, 
      error: 'HANDLER_EXCEPTION' 
    }, { status: 500 });
  }
}

/**
 * Handle conversation update events
 */
async function handleConversationUpdate(body: any) {
  console.log('[Vapi Webhook] Conversation update:', {
    callId: body?.call?.id,
    assistantId: body?.assistant?.id,
    messageCount: body?.message?.length || 0
  });
  
  // TODO: Store conversation data if needed
  // Could save to database for analytics, customer service, etc.
}

/**
 * Handle call started events
 */
async function handleCallStarted(body: any) {
  console.log('[Vapi Webhook] Call started:', {
    callId: body?.call?.id,
    assistantId: body?.assistant?.id,
    customerNumber: body?.customer?.number,
    timestamp: body?.call?.createdAt
  });
  
  // TODO: Log call start for analytics
  // Could track call volume, peak times, etc.
}

/**
 * Handle call ended events
 */
async function handleCallEnded(body: any) {
  console.log('[Vapi Webhook] Call ended:', {
    callId: body?.call?.id,
    assistantId: body?.assistant?.id,
    duration: body?.call?.duration,
    status: body?.call?.status,
    timestamp: body?.call?.endedAt
  });
  
  // TODO: Log call end for analytics
  // Could track call duration, success rates, etc.
}

/**
 * Handle transcript available events
 */
async function handleTranscriptAvailable(body: any) {
  console.log('[Vapi Webhook] Transcript available:', {
    callId: body?.call?.id,
    assistantId: body?.assistant?.id,
    transcriptLength: body?.transcript?.length || 0
  });
  
  // TODO: Store transcript if needed
  // Could save for customer service review, training, etc.
}

/**
 * Handle status update events
 */
async function handleStatusUpdate(body: any) {
  console.log('[Vapi Webhook] Status update:', {
    callId: body?.call?.id,
    assistantId: body?.assistant?.id,
    status: body?.call?.status
  });
}

/**
 * Handle speech update events
 */
async function handleSpeechUpdate(body: any) {
  console.log('[Vapi Webhook] Speech update:', {
    callId: body?.call?.id,
    assistantId: body?.assistant?.id,
    speechType: body?.speech?.type
  });
}

/**
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoint: '/api/vapi/webhook',
    purpose: 'Conversation/call lifecycle events - tool calls go to /api/vapi/functions'
  });
}