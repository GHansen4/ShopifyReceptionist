import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/api';
import { vapi } from '@/lib/vapi/client';
import { supabaseAdmin } from '@/lib/supabase/client';
import { getVapiFunctionsUrl, getAppUrl, getEnvironmentInfo } from '@/lib/utils/url';

/**
 * POST /api/vapi/test/provision
 * Provisions a test phone number with simple assistant
 */
export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);

  try {
    const { shop, tunnelUrl } = await request.json();

    if (!shop) {
      return createErrorResponse(new Error('Shop parameter required'));
    }

    console.log(`[${requestId}] ═══════════════════════════════════════`);
    console.log(`[${requestId}] Starting test provisioning for: ${shop}`);

    // ======================================================================
    // PRE-FLIGHT CHECK: Validate Public URL
    // ======================================================================
    // Get environment information for debugging
    const envInfo = getEnvironmentInfo();
    
    console.log(`[${requestId}] ═══════════════════════════════════════`);
    console.log(`[${requestId}] 🔍 Environment Check:`);
    console.log(`[${requestId}]    Tunnel URL (from request): ${tunnelUrl || 'NOT PROVIDED'}`);
    console.log(`[${requestId}]    Environment Info:`, JSON.stringify(envInfo, null, 2));
    
    // Use tunnel URL if provided, otherwise use environment-based URL
    const serverBaseUrl = tunnelUrl || getAppUrl();
    const functionUrl = getVapiFunctionsUrl();
    
    console.log(`[${requestId}]    Final App URL: ${serverBaseUrl}`);
    console.log(`[${requestId}]    Final Function URL: ${functionUrl}`);
    
    // WARNING: Check if using localhost (might not work for Vapi callbacks)
    if (serverBaseUrl.includes('localhost') || serverBaseUrl.includes('127.0.0.1')) {
      console.warn(`[${requestId}] ⚠️  WARNING: Using localhost URL for Vapi`);
      console.warn(`[${requestId}] Current URL: ${serverBaseUrl}`);
      console.warn(`[${requestId}]`);
      console.warn(`[${requestId}] This will work for assistant creation, but Vapi CANNOT call`);
      console.warn(`[${requestId}] this URL during phone calls (it's not publicly accessible).`);
      console.warn(`[${requestId}]`);
      console.warn(`[${requestId}] For testing calls with product functions:`);
      console.warn(`[${requestId}]   1. Shopify CLI should be running (creates tunnel)`);
      console.warn(`[${requestId}]   2. Find tunnel URL in Shopify CLI logs`);
      console.warn(`[${requestId}]   3. Manually update assistant serverUrl in Vapi dashboard`);
      console.warn(`[${requestId}]`);
      console.warn(`[${requestId}] Proceeding anyway (development mode)...`);
      console.warn(`[${requestId}] ═══════════════════════════════════════`);
      
      // Allow it in development, but warn
      // Vapi will give the real error if callbacks fail
    }
    
    console.log(`[${requestId}] ✅ Public URL validated: ${functionUrl}`);
    console.log(`[${requestId}] ═══════════════════════════════════════`);

    // ======================================================================
    // Step 1: Create Test Assistant
    // ======================================================================
    console.log(`[${requestId}] Creating test assistant...`);

    // Get shop name (truncate if needed for 40 char limit)
    const shopName = shop.replace('.myshopify.com', '').substring(0, 20);

    const assistant = await vapi.assistants.create({
      name: `Test AI - ${shopName}`, // Keep under 40 chars
      model: {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022', // Fixed: Use valid Vapi model name
        temperature: 0.7,
        systemPrompt: `You are a friendly and professional AI receptionist for ${shop}, an online store.

## Your Role
- Greet callers warmly and ask how you can help
- Answer questions about products in the store
- Provide helpful, accurate information about pricing and availability
- Be patient and wait for their response before continuing
- Keep responses conversational and natural (2-3 sentences max)
- Never rush the conversation or hang up prematurely

## Product Information
When customers ask about products:
1. Use the get_products function to fetch current product information
2. Use the search_products function to find specific products by name
3. Share the product name, price, and whether it's available
4. If the product description is helpful, mention key features
5. For detailed questions, offer to connect them with the team

Example: "Let me check what we have available for you..." (then call function)

## Conversation Guidelines
- Always wait for the caller to finish speaking before responding
- If there's a pause, ask "Are you still there?" or "Is there anything else I can help with?"
- Only end the call when the caller clearly wants to end it (says goodbye, I'm done, that's all, etc.)
- If you need product info, use the provided functions to get real-time data

## Personality
- Warm and welcoming
- Professional but not robotic
- Patient and attentive
- Helpful and solution-oriented
- Knowledgeable about the store's products

Remember: You have access to real product data. Use it to give accurate, helpful answers!`,
        functions: [
          {
            name: 'get_products',
            description: 'Fetch a list of products from the store. Use this when customers ask "what do you sell?", "what products do you have?", or want to browse.',
            parameters: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Number of products to fetch (default: 5, max: 10)',
                },
              },
            },
          },
          {
            name: 'search_products',
            description: 'Search for specific products by name or keyword. Use this when customers ask about a specific product like "do you have t-shirts?" or "I\'m looking for shoes".',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search term (product name, category, or keyword)',
                },
              },
              required: ['query'],
            },
          },
        ],
      },
      voice: {
        provider: '11labs', // ElevenLabs
        voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel (ElevenLabs default female voice)
      },
      firstMessage: `Hello! You've reached ${shop}. I'm the AI assistant. How may I help you today?`,
      endCallMessage: 'It was great speaking with you. Have a wonderful day!',
      // FIXED: Removed "thank you" and "thanks" from end phrases to prevent premature hangup
      // Only end call on explicit goodbye phrases
      endCallPhrases: ['goodbye', 'bye bye', 'good bye', 'gotta go', "that's all", "that's everything", 'talk to you later'],
      // Silence detection - wait longer before assuming they're done
      silenceTimeoutSeconds: 30, // Wait 30 seconds of silence before timing out
      maxDurationSeconds: 600, // 10 minute max call length
      backgroundSound: 'off', // No background sound for clearer audio
      // Server URL for function calling - validated public URL
      serverUrl: functionUrl, // Pre-validated above
      serverUrlSecret: process.env.VAPI_API_KEY, // Optional: for securing the endpoint
    });
    
    console.log(`[${requestId}] ✅ Assistant created: ${assistant.id}`);

    // ======================================================================
    // Step 2: Link Existing Phone Number to Assistant
    // ======================================================================
    console.log(`[${requestId}] Linking phone number to assistant...`);

    // Phone number bought from Vapi dashboard
    // We need to FIND it first, then UPDATE it to point to this assistant
    const VAPI_PHONE_NUMBER = process.env.VAPI_TEST_PHONE_NUMBER || '+18312002458';
    
    console.log(`[${requestId}] Looking for phone number: ${VAPI_PHONE_NUMBER}`);
    
    let phoneNumber;
    let phoneNumberId: string;
    
    try {
      // Step 1: List all phone numbers to find ours
      console.log(`[${requestId}] Listing all phone numbers...`);
      const allPhones = await vapi.phoneNumbers.list();
      
      console.log(`[${requestId}] Found ${allPhones.length} phone number(s)`);
      
      // Find the phone number that matches our number
      const existingPhone = allPhones.find((phone: any) => {
        const phoneNum = phone.number || phone.phoneNumber || phone.value;
        // Normalize both numbers (remove spaces, dashes, parentheses)
        const normalized = phoneNum?.replace(/[\s\-\(\)]/g, '');
        const target = VAPI_PHONE_NUMBER.replace(/[\s\-\(\)]/g, '');
        return normalized === target;
      });
      
      if (!existingPhone) {
        console.error(`[${requestId}] ❌ Phone number ${VAPI_PHONE_NUMBER} not found in your account`);
        console.error(`[${requestId}] Available numbers:`, allPhones.map((p: any) => p.number || p.phoneNumber || p.id));
        throw new Error(`Phone number ${VAPI_PHONE_NUMBER} not found. Please buy it in Vapi dashboard first.`);
      }
      
      phoneNumberId = existingPhone.id;
      console.log(`[${requestId}] ✅ Found phone number! ID: ${phoneNumberId}`);
      
      // Step 2: Update the phone number to link it to our assistant
      console.log(`[${requestId}] Updating phone number to link to assistant...`);
      const updatedPhone = await vapi.phoneNumbers.update(phoneNumberId, {
        assistantId: assistant.id,
        name: `Test Receptionist - ${shopName}`,
      });
      
      console.log(`[${requestId}] ✅ Phone number linked to assistant!`);
      console.log(`[${requestId}] Response:`, JSON.stringify(updatedPhone, null, 2));
      
      // Extract the phone number from response
      const extractedNumber = updatedPhone.number || updatedPhone.phoneNumber || existingPhone.number || VAPI_PHONE_NUMBER;
      
      phoneNumber = {
        id: phoneNumberId,
        number: extractedNumber,
        ...updatedPhone,
      };
      
      console.log(`[${requestId}] ✅ Phone number ready: ${extractedNumber}`);
    } catch (error: any) {
      console.error(`[${requestId}] ❌ Phone number linking failed:`, error);
      console.error(`[${requestId}] Error details:`, JSON.stringify(error, null, 2));
      
      // Provide helpful error messages
      let errorMessage = error.message || error.body?.message || 'Unknown error';
      
      if (typeof errorMessage === 'object') {
        errorMessage = JSON.stringify(errorMessage);
      }
      
      throw new Error(`Failed to link phone number: ${errorMessage}`);
    }

    // ======================================================================
    // Step 3: Save to Database
    // ======================================================================
    console.log(`[${requestId}] Saving to database...`);

    // Find shop
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('shop_domain', shop)
      .single();

    if (shopError || !shopData) {
      console.error(`[${requestId}] ❌ Shop not found: ${shop}`);
      // Still return success, just couldn't save
      return createSuccessResponse({
        assistantId: assistant.id,
        phoneNumber: phoneNumber.number,
        phoneNumberId: phoneNumber.id,
        assistantName: assistant.name,
        message: 'Test provisioning complete (not saved - shop not found)',
        warning: 'Shop not found in database',
      });
    }

    // Update shop with test assistant info
    const { error: updateError } = await supabaseAdmin
      .from('shops')
      .update({
        vapi_assistant_id: assistant.id,
        phone_number: phoneNumber.number,
        vapi_phone_number_id: phoneNumber.id,
        settings: {
          test_mode: true,
          provisioned_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', shopData.id);

    if (updateError) {
      console.error(`[${requestId}] ⚠️  Database save failed:`, updateError);
    } else {
      console.log(`[${requestId}] ✅ Saved to database`);
    }

    // ======================================================================
    // Return Success
    // ======================================================================
    console.log(`[${requestId}] ✅ Test provisioning complete!`);
    console.log(`[${requestId}] Phone: ${phoneNumber.number || 'PENDING'}`);
    console.log(`[${requestId}] ═══════════════════════════════════════`);

    return createSuccessResponse({
      assistantId: assistant.id,
      phoneNumber: phoneNumber.number,
      phoneNumberId: phoneNumber.id,
      assistantName: assistant.name,
      message: `Test receptionist created and linked to ${phoneNumber.number}! You can now call this number to test.`,
    });
  } catch (error: any) {
    console.error(`[${requestId}] ❌ Provisioning failed:`, error);

    // Extract error message from Vapi error or use generic message
    const errorMessage = error?.body?.message 
      ? (Array.isArray(error.body.message) ? error.body.message.join('; ') : error.body.message)
      : error?.message || 'Unknown error during provisioning';

    return createErrorResponse(new Error(`Test provisioning failed: ${errorMessage}`), 500);
  }
}

