import { NextRequest } from 'next/server';
import { shopify } from '@/lib/shopify/client';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/api';
import { AuthenticationError } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  try {
    // Use Shopify's official authentication pattern
    const { session } = await shopify.authenticate.admin(request);

    if (!session) {
      return createErrorResponse(new AuthenticationError('Not authenticated'));
    }

    // This is a protected route - Shopify has validated the session
    // session contains: shop, accessToken, isOnline, etc.

    return createSuccessResponse({
      message: 'Protected endpoint accessed successfully',
      shop: session.shop,
      receptionists: [], // TODO: Fetch receptionists from database for this shop
    });
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Use Shopify's official authentication pattern
    const { session } = await shopify.authenticate.admin(request);

    if (!session) {
      return createErrorResponse(new AuthenticationError('Not authenticated'));
    }

    // TODO: Validate data using Zod schema
    void (await request.json());

    // TODO: Create receptionist for this shop
    // Validate data, store in Supabase

    return createSuccessResponse(
      {
        message: 'Receptionist created',
        shop: session.shop,
      },
      201
    );
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}
