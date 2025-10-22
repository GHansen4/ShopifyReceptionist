import { NextRequest, NextResponse } from 'next/server';
import {
  verifyWebhookHmac,
  parseWebhookPayload,
  getShopFromWebhook,
  routeWebhook,
} from '@/lib/webhooks';
import { logError } from '@/lib/utils/errors';
import { withWebhookRateLimit } from '@/lib/rate-limiter-middleware';

/**
 * Webhook endpoint for receiving Shopify webhooks
 * CRITICAL: This endpoint receives raw request body for HMAC verification
 * Must not use automatic JSON parsing as it requires raw body
 */
export async function POST(request: NextRequest) {
  return withWebhookRateLimit(request, async () => {
    const startTime = Date.now();

    try {
      // Get raw request body BEFORE any parsing
      const arrayBuffer = await request.arrayBuffer();
      const rawBody = Buffer.from(arrayBuffer);

      // Extract HMAC header
      const hmacHeader = request.headers.get('x-shopify-hmac-sha256');
      if (!hmacHeader) {
        console.warn('Webhook received without HMAC header');
        // Return 200 anyway to avoid Shopify retries, but log the error
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'MISSING_HMAC',
              message: 'Missing HMAC header',
              statusCode: 401,
            },
            timestamp: new Date().toISOString(),
          },
          { status: 200 } // Return 200 to prevent Shopify retries
        );
      }

      // Verify HMAC signature
      const hmacValid = verifyWebhookHmac(rawBody, hmacHeader);
      if (!hmacValid) {
        console.error('Webhook HMAC verification failed');
        // Return 200 anyway to prevent Shopify retries
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_HMAC',
              message: 'HMAC verification failed',
              statusCode: 401,
            },
            timestamp: new Date().toISOString(),
          },
          { status: 200 }
        );
      }

      // Parse webhook payload
      const payload = parseWebhookPayload(rawBody);
      if (!payload) {
        console.error('Failed to parse webhook payload');
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_PAYLOAD',
              message: 'Failed to parse webhook payload',
              statusCode: 400,
            },
            timestamp: new Date().toISOString(),
          },
          { status: 200 }
        );
      }

      // Extract required fields
      const topic = request.headers.get('x-shopify-topic');
      if (!topic) {
        console.warn('Webhook received without topic header');
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'MISSING_TOPIC',
              message: 'Missing topic header',
              statusCode: 400,
            },
            timestamp: new Date().toISOString(),
          },
          { status: 200 }
        );
      }

      // Extract shop domain from payload
      const shop = getShopFromWebhook(payload);
      if (!shop) {
        console.warn('Could not extract shop from webhook payload');
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'MISSING_SHOP',
              message: 'Could not extract shop from payload',
              statusCode: 400,
            },
            timestamp: new Date().toISOString(),
          },
          { status: 200 }
        );
      }

      // Route to appropriate handler
      try {
        await routeWebhook(topic, payload, shop);

        const duration = Date.now() - startTime;
        console.log(`Webhook processed successfully: ${topic} for ${shop} (${duration}ms)`);

        return NextResponse.json(
          {
            success: true,
            data: {
              webhook_id: payload.id,
              topic,
              shop,
              processed_at: new Date().toISOString(),
            },
            timestamp: new Date().toISOString(),
          },
          { status: 200 }
        );
      } catch (handlerError) {
        logError(handlerError, {
          webhook_topic: topic,
          webhook_id: payload.id,
          shop,
          stage: 'webhook_handler',
        });

        // Still return 200 to prevent Shopify retries
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'HANDLER_ERROR',
              message: 'Error processing webhook',
              statusCode: 500,
            },
            timestamp: new Date().toISOString(),
          },
          { status: 200 }
        );
      }
    } catch (error) {
      logError(error, {
        stage: 'webhook_request_parsing',
      });

      // Return 200 even on critical errors to prevent Shopify retries
      // Webhooks are fire-and-forget, retries are based on response status
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'REQUEST_ERROR',
            message: 'Error processing webhook request',
            statusCode: 500,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }
  });
}

/**
 * Return 200 for HEAD requests (health check)
 */
export async function HEAD() {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
