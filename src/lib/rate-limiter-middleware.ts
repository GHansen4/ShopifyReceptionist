import { NextRequest, NextResponse } from 'next/server';
import {
  vapiLimiter,
  webhookLimiter,
  authLimiter,
  getRateLimitHeaders,
  getMetrics,
} from './rate-limiter';
import { RateLimitError } from './utils/errors';
import { logError } from './utils/errors';

/**
 * Extract shop ID from request context
 */
function getShopIdFromRequest(request: NextRequest): string | null {
  if (!request || !request.headers) {
    return null;
  }
  return request.headers.get('x-shopify-shop') || null;
}

/**
 * Extract IP address from request
 */
function getIpFromRequest(request: NextRequest): string {
  if (!request || !request.headers) {
    return 'unknown';
  }
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Middleware for Shopify API calls
 */
export async function withShopifyRateLimit(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const shopId = getShopIdFromRequest(request);

  if (!shopId) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_SHOP_ID', message: 'Shop ID required' } },
      { status: 400 }
    );
  }

  try {
    return await handler();
  } catch (error) {
    if (error instanceof RateLimitError) {
      const status = { remaining: 0, resetAt: Date.now() + 1000, limit: 2 };
      const headers = getRateLimitHeaders(status);
      logError(error, { shopId, type: 'shopify_rate_limit' });
      return NextResponse.json(
        {
          success: false,
          error: { code: 'RATE_LIMIT', message: error.message, statusCode: 429 },
        },
        { status: 429, headers }
      );
    }
    throw error;
  }
}

/**
 * Middleware for webhook rate limiting
 */
export async function withWebhookRateLimit(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  if (!request || !request.headers) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_REQUEST', message: 'Invalid request object' } },
      { status: 400 }
    );
  }

  const shopDomain = request.headers.get('x-shopify-shop-api-call-limit');

  if (!shopDomain) {
    return NextResponse.json(
      { success: false, error: { code: 'MISSING_SHOP', message: 'Missing shop identifier' } },
      { status: 400 }
    );
  }

  const status = webhookLimiter.checkLimit(shopDomain);

  if (status.remaining === 0) {
    const headers = getRateLimitHeaders(status);
    logError(new Error('Webhook rate limit exceeded'), {
      shop: shopDomain,
      type: 'webhook_rate_limit',
    });
    return NextResponse.json(
      { success: false, error: { code: 'WEBHOOK_RATE_LIMIT', message: 'Too many webhooks' } },
      { status: 429, headers }
    );
  }

  try {
    const response = await handler();
    const headers = new Headers(response.headers);
    Object.entries(getRateLimitHeaders(status)).forEach(([key, value]) => {
      headers.set(key, value);
    });
    return new NextResponse(response.body, { status: response.status, headers });
  } catch (error) {
    logError(error, { shop: shopDomain, type: 'webhook_processing' });
    throw error;
  }
}

/**
 * Middleware for auth rate limiting
 */
export async function withAuthRateLimit(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const ip = getIpFromRequest(request);
  const { allowed, status } = authLimiter.checkAuthAttempt(ip);

  if (!allowed) {
    const headers = getRateLimitHeaders(status);
    logError(new Error('Auth rate limit exceeded'), { ip, type: 'auth_rate_limit' });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AUTH_RATE_LIMIT',
          message: 'Too many authentication attempts. Please try again later.',
          statusCode: 429,
        },
      },
      { status: 429, headers }
    );
  }

  try {
    const response = await handler();
    const headers = new Headers(response.headers);
    Object.entries(getRateLimitHeaders(status)).forEach(([key, value]) => {
      headers.set(key, value);
    });
    return new NextResponse(response.body, { status: response.status, headers });
  } catch (error) {
    logError(error, { ip, type: 'auth_processing' });
    throw error;
  }
}

/**
 * Middleware for Vapi call rate limiting
 */
export function checkVapiRateLimit(
  shopId: string,
  durationSeconds: number,
  costCents: number
): { allowed: boolean; message?: string } {
  const result = vapiLimiter.recordCall(shopId, durationSeconds, costCents);

  if (!result.allowed) {
    logError(new Error('Vapi rate limit exceeded'), {
      shopId,
      callsRemaining: result.callsRemaining,
      type: 'vapi_rate_limit',
    });
    return {
      allowed: false,
      message: `Vapi call limit exceeded for this hour. Calls remaining: ${result.callsRemaining}`,
    };
  }

  return { allowed: true };
}

/**
 * Get current rate limit metrics (for admin dashboard)
 */
export function getRateLimitMetricsEndpoint(): NextResponse {
  const metrics = getMetrics();

  return NextResponse.json(
    {
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
