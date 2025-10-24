import { NextRequest } from 'next/server';
import { shopify } from '@/lib/shopify/client';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/api';
import { AuthenticationError } from '@/lib/utils/errors';
import { getMetrics } from '@/lib/rate-limiter';

/**
 * Admin endpoint for rate limit metrics - SHOPIFY OFFICIAL PATTERN
 * GET /api/admin/rate-limits
 */
export async function GET(request: NextRequest) {
  try {
    // Use Shopify's official authentication pattern
    const { session } = await shopify.authenticate.admin(request);

    if (!session) {
      return createErrorResponse(new AuthenticationError('Not authenticated'));
    }

    const metrics = getMetrics();

    return createSuccessResponse({
      metrics,
      timestamp: new Date().toISOString(),
      info: {
        shopify: 'Shopify API: 2 requests per second per shop',
        vapi: 'Vapi: 100 calls per hour per shop',
        webhook: 'Webhooks: 100 per minute per shop',
        auth: 'Auth: 5 attempts per hour per IP',
      },
    });
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}
