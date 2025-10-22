import { NextRequest } from 'next/server';
import { getShopContext } from '@/lib/shopify/context';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/api';
import { AuthenticationError } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  try {
    // Get shop context (validated by middleware)
    const shopContext = getShopContext(request);

    if (!shopContext) {
      return createErrorResponse(new AuthenticationError('Not authenticated'));
    }

    // This is a protected route - middleware has already validated the session token
    // shopContext contains: shop domain, session token, and user ID

    return createSuccessResponse({
      message: 'Protected endpoint accessed successfully',
      shop: shopContext.shop,
      receptionists: [], // TODO: Fetch receptionists from database for this shop
    });
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const shopContext = getShopContext(request);

    if (!shopContext) {
      return createErrorResponse(new AuthenticationError('Not authenticated'));
    }

    // TODO: Validate data using Zod schema
    void (await request.json());

    // TODO: Create receptionist for this shop
    // Validate data, store in Supabase

    return createSuccessResponse(
      {
        message: 'Receptionist created',
        shop: shopContext.shop,
      },
      201
    );
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}
