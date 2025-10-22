import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/api';
import { vapi } from '@/lib/vapi/client';
import { supabaseAdmin } from '@/lib/supabase/client';

/**
 * DELETE /api/vapi/test/cleanup
 * Deletes test assistants and phone numbers
 */
export async function DELETE(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);

  try {
    const { shop, assistantId, phoneNumberId } = await request.json();

    if (!shop) {
      return createErrorResponse(new Error('Shop parameter required'));
    }

    console.log(`[${requestId}] ═══════════════════════════════════════`);
    console.log(`[${requestId}] Starting cleanup for: ${shop}`);

    const deleted: string[] = [];
    const errors: string[] = [];

    // ======================================================================
    // Delete Phone Number
    // ======================================================================
    if (phoneNumberId) {
      try {
        console.log(`[${requestId}] Deleting phone number: ${phoneNumberId}`);
        await vapi.phoneNumbers.delete(phoneNumberId);
        deleted.push(`Phone number: ${phoneNumberId}`);
        console.log(`[${requestId}] ✅ Phone number deleted`);
      } catch (error: any) {
        console.error(`[${requestId}] ❌ Failed to delete phone number:`, error);
        errors.push(`Phone number: ${error.message || 'Unknown error'}`);
      }
    }

    // ======================================================================
    // Delete Assistant
    // ======================================================================
    if (assistantId) {
      try {
        console.log(`[${requestId}] Deleting assistant: ${assistantId}`);
        await vapi.assistants.delete(assistantId);
        deleted.push(`Assistant: ${assistantId}`);
        console.log(`[${requestId}] ✅ Assistant deleted`);
      } catch (error: any) {
        console.error(`[${requestId}] ❌ Failed to delete assistant:`, error);
        errors.push(`Assistant: ${error.message || 'Unknown error'}`);
      }
    }

    // ======================================================================
    // Clean Database
    // ======================================================================
    try {
      console.log(`[${requestId}] Cleaning database...`);

      const { error: updateError } = await supabaseAdmin
        .from('shops')
        .update({
          vapi_assistant_id: null,
          phone_number: null,
          vapi_phone_number_id: null,
          settings: {
            test_mode: false,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('shop_domain', shop);

      if (updateError) {
        console.error(`[${requestId}] ⚠️  Database cleanup failed:`, updateError);
        errors.push(`Database: ${updateError.message}`);
      } else {
        deleted.push('Database records');
        console.log(`[${requestId}] ✅ Database cleaned`);
      }
    } catch (error: any) {
      console.error(`[${requestId}] ❌ Database cleanup error:`, error);
      errors.push(`Database: ${error.message}`);
    }

    // ======================================================================
    // Return Results
    // ======================================================================
    console.log(`[${requestId}] Cleanup complete:`);
    console.log(`[${requestId}] - Deleted: ${deleted.length} resources`);
    console.log(`[${requestId}] - Errors: ${errors.length} errors`);
    console.log(`[${requestId}] ═══════════════════════════════════════`);

    return createSuccessResponse({
      deleted,
      errors,
      message: errors.length > 0 
        ? 'Cleanup completed with some errors' 
        : 'All test resources deleted successfully',
    });
  } catch (error: any) {
    console.error(`[${requestId}] ❌ Cleanup failed:`, error);
    return createErrorResponse(error, 'Cleanup failed');
  }
}

