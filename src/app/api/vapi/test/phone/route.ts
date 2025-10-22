import { NextRequest, NextResponse } from 'next/server';
import { vapi } from '@/lib/vapi/client';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api';

// Force dynamic rendering (uses query params)
export const dynamic = 'force-dynamic';

/**
 * Fetch a phone number by ID from Vapi
 * GET /api/vapi/test/phone?id=<phone-number-id>
 */
export async function GET(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const phoneNumberId = searchParams.get('id');

    if (!phoneNumberId) {
      return createErrorResponse(
        new Error('Phone number ID is required'),
        'Missing phone number ID',
        400
      );
    }

    if (isDev) {
      console.log(`[Vapi Phone Fetch] Fetching phone number: ${phoneNumberId}`);
    }

    // Fetch phone number details
    const phoneNumber = await vapi.phoneNumbers.get(phoneNumberId);

    if (isDev) {
      console.log(`[Vapi Phone Fetch] Response:`, JSON.stringify(phoneNumber, null, 2));
    }

    // Try to extract the actual phone number
    const extractedNumber = phoneNumber.number || phoneNumber.phoneNumber || phoneNumber.value || phoneNumber.e164 || phoneNumber.telephoneNumber;

    return createSuccessResponse({
      phoneNumberId: phoneNumber.id,
      phoneNumber: extractedNumber || null,
      status: phoneNumber.status,
      provider: phoneNumber.provider,
      assistantId: phoneNumber.assistantId,
      raw: phoneNumber, // Include full response for debugging
    });

  } catch (error: any) {
    console.error('[Vapi Phone Fetch] Error:', error);
    return createErrorResponse(
      error,
      `Failed to fetch phone number: ${error.message || 'Unknown error'}`,
      500
    );
  }
}

