import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/api';
import { AuthenticationError } from '@/lib/utils/errors';
import { getMetrics } from '@/lib/rate-limiter';

/**
 * Admin endpoint for rate limit metrics
 * GET /api/admin/rate-limits
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access (this is a simplified check)
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return createErrorResponse(new AuthenticationError('Admin access required'));
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
