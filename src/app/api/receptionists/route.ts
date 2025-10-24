import { NextRequest } from 'next/server';
import { shopify } from '@/lib/shopify/client';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/api';
import { AuthenticationError, ValidationError } from '@/lib/utils/errors';

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
      receptionists: [], // Empty for now - will be implemented when needed
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

    // Validate input data
    const { name, phoneNumber } = await request.json();
    
    if (!name || !phoneNumber) {
      return createErrorResponse(new ValidationError('Name and phone number are required'));
    }

    // Create receptionist for this shop (placeholder implementation)
    // TODO: Implement actual database storage when needed

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
