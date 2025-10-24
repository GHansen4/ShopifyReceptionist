import { NextRequest } from 'next/server';
import { getShopContext } from '@/lib/shopify/context';
import { supabaseAdmin } from '@/lib/supabase/client';
import {
  provisionReceptionist,
  validateAssistantConfig,
  type VapiAssistantConfig,
} from '@/lib/vapi';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/api';
import { AuthenticationError, ExternalServiceError, ValidationError } from '@/lib/utils/errors';
import { logError } from '@/lib/utils/errors';
import { normalizeShopDomain } from '@/lib/normalize';

/**
 * POST /api/vapi/provision
 * Provisions a new Vapi assistant and phone number for the shop
 * Called during app installation or when user clicks "Setup AI Receptionist"
 *
 * Flow:
 * 1. Validate session token & shop context
 * 2. Fetch shop data and top products
 * 3. Create Vapi assistant with retry logic
 * 4. Provision phone number with fallback area codes
 * 5. Save to database
 * 6. Return phone number to frontend
 */
export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);

  try {
    console.log(`[${requestId}] 🔍 VAPI PROVISION DEBUG: Starting detailed debugging...`);
    
    // Validate request object first
    if (!request || !request.headers) {
      console.error(`[${requestId}] ❌ Invalid request object`);
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid request object - missing headers',
          statusCode: 400,
        },
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }
    
    console.log(`[${requestId}] Request headers:`, {
      'x-shopify-shop': request.headers.get('x-shopify-shop'),
      'x-shopify-session-token': request.headers.get('x-shopify-session-token'),
      'x-shopify-user-id': request.headers.get('x-shopify-user-id'),
      'authorization': request.headers.get('authorization'),
      'host': request.headers.get('host')
    });

    // ======================================================================
    // Step 1: Validate Authentication using Shopify's official pattern
    // ======================================================================
    console.log(`[${requestId}] STEP 1: Authenticating with Shopify...`);
    
    let session;
    try {
      const authResult = await shopify.authenticate.admin(request);
      session = authResult.session;
    } catch (authError) {
      console.log(`[${requestId}] ❌ STEP 1 FAILED: Shopify authentication failed:`, authError);
      return createErrorResponse(new AuthenticationError('Shopify authentication failed'));
    }
    
    if (!session) {
      console.log(`[${requestId}] ❌ STEP 1 FAILED: No session from Shopify`);
      return createErrorResponse(new AuthenticationError('No session found'));
    }

    console.log(`[${requestId}] ✅ STEP 1 SUCCESS: Authenticated shop: ${session.shop}`);

    // ======================================================================
    // Step 2: Fetch Shop Data from shopify_sessions (where OAuth actually saves data)
    // ======================================================================
    console.log(`[${requestId}] STEP 2: Looking for shop in shopify_sessions table: ${session.shop}`);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sessionData, error: sessionError } = await (supabase as any)
      .from('shopify_sessions')
      .select('*')
      .eq('shop', session.shop)
      .single();

    console.log(`[${requestId}] STEP 2 Database query result:`, {
      error: sessionError,
      sessionData: sessionData,
      shopDomain: session.shop
    });

    if (sessionError || !sessionData) {
      console.error(`[${requestId}] ❌ STEP 2 FAILED: Shop not found in shopify_sessions:`, sessionError);
      return createErrorResponse(new ExternalServiceError('Shop not found - OAuth may not have completed properly', 'supabase'));
    }

    console.log(`[${requestId}] ✅ STEP 2 SUCCESS: Found shop session: ${session.shop}`);
    
    // Create shop object from session data
    const shop = {
      id: sessionData.id,
      shop_domain: sessionData.shop,
      shop_name: sessionData.shop.replace('.myshopify.com', ''),
      access_token: sessionData.access_token,
      installed_at: sessionData.created_at,
      subscription_status: 'trial',
      plan_name: 'starter',
      call_minutes_used: 0,
      call_minutes_limit: 100,
      vapi_assistant_id: null,
      vapi_phone_number_id: null,
      phone_number: null,
      settings: {},
      email: null,
      timezone: 'UTC',
      phone_number: null,
      updated_at: session.updated_at,
      created_at: session.created_at
    };

    console.log(`[${requestId}] Found shop: ${shop.shop_name || shop.shop_domain}`);

    // Check if already provisioned
    if (shop.vapi_assistant_id && shop.phone_number) {
      console.log(`[${requestId}] ⚠️ Shop already provisioned with phone: ${shop.phone_number}`);
      return createSuccessResponse({
        status: 'already_provisioned',
        phoneNumber: shop.phone_number as string,
        assistantId: shop.vapi_assistant_id as string,
        message: 'AI Receptionist already configured',
      });
    }

    // ======================================================================
    // Step 3: Fetch Top Products
    // ======================================================================
    console.log(`[${requestId}] Fetching products for assistant context...`);

    // Get top 20 products (by creation date, most recent first)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: products, error: productsError } = await (supabase as any)
      .from('products')
      .select('*')
      .eq('shop_id', shop.id as string)
      .order('created_at', { ascending: false })
      .limit(20);

    if (productsError) {
      logError(productsError, {
        context: 'fetch_products_for_vapi',
        shopId: shop.id,
      });
      // Continue even if no products - can still create assistant
    }

    const productList =
      products && products.length > 0
        ? products
        : [
            {
              id: 'placeholder',
              shop_id: shop.id,
              shopify_product_id: 'placeholder',
              title: 'Sample Product',
              description: 'Welcome to our store! We have many products available.',
              price: 9900, // $99.00
              currency: 'USD',
              inventory_quantity: 0,
              image_url: null,
              product_url: null,
              variants: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ];

    console.log(`[${requestId}] Found ${productList.length} products for context`);

    // ======================================================================
    // Step 4: Validate Configuration
    // ======================================================================
    const assistantConfig: VapiAssistantConfig = {
      shopId: shop.id as string,
      shopName: (shop.shop_name as string) || shopContext.shop,
      products: productList,
      voiceId: (shop.settings?.voice_id as string) || 'rachel',
      hoursOfOperation: (shop.settings?.hours_of_operation as string) || undefined,
    };

    console.log(`[${requestId}] Validating assistant configuration...`);
    validateAssistantConfig(assistantConfig);
    console.log(`[${requestId}] ✅ Configuration validated`);

    // ======================================================================
    // Step 5: Provision Vapi Assistant & Phone Number (with retries)
    // ======================================================================
    console.log(`[${requestId}] Starting Vapi provisioning with retry logic...`);

    const provisioningResult = await provisionReceptionist(assistantConfig);

    console.log(`[${requestId}] ✅ Provisioning complete: ${provisioningResult.phoneNumber}`);

    // ======================================================================
    // Step 6: Save to Database
    // ======================================================================
    console.log(`[${requestId}] Saving provisioning results to database...`);

    // Update shops table using normalized shop domain
    const normalizedShopDomain = normalizeShopDomain(shopContext.shop);
    console.log(`[${requestId}] Updating shops table for normalized domain: ${normalizedShopDomain}`);
    
    const { error: updateError } = await supabaseAdmin
      .from('shops')
      .update({
        vapi_assistant_id: provisioningResult.assistantId,
        phone_number: provisioningResult.phoneNumber,
        vapi_phone_number_id: provisioningResult.phoneNumber, // Store for reference
        settings: {
          ...shop.settings,
          voice_receptionist_active: true,
          provisioned_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('shop_domain', normalizedShopDomain);

    if (updateError) {
      logError(updateError, {
        context: 'save_vapi_provision',
        shopId: shop.id,
        assistantId: provisioningResult.assistantId,
        phoneNumber: provisioningResult.phoneNumber,
      });

      // Log this as a critical error - provisioning succeeded but DB save failed
      return createErrorResponse(
        new ExternalServiceError(
          'Provisioning succeeded but failed to save to database. Please contact support.',
          'supabase',
          {
            assistantId: provisioningResult.assistantId,
            phoneNumber: provisioningResult.phoneNumber,
          }
        )
      );
    }

    console.log(`[${requestId}] ✅ Successfully saved to database. Provision complete!`);

    // ======================================================================
    // Step 7: Return Success
    // ======================================================================
    return createSuccessResponse({
      status: 'provisioned',
      assistantId: provisioningResult.assistantId,
      assistantName: provisioningResult.assistantName,
      phoneNumber: provisioningResult.phoneNumber,
      message: 'AI Receptionist setup complete!',
      setupTime: 'approx. 30 seconds',
    });
  } catch (error) {
    // Comprehensive error logging
    logError(error, {
      context: 'vapi_provision_endpoint',
      requestId,
    });

    // Determine if this is a validation error or external service error
    if (error instanceof ValidationError) {
      return createErrorResponse(error);
    }

    if (error instanceof ExternalServiceError) {
      return createErrorResponse(error);
    }

    // Generic error
    return createErrorResponse(error as Error);
  }
}

/**
 * GET /api/vapi/provision
 * Check if shop already has a provisioned AI receptionist
 */
export async function GET(request: NextRequest) {
  try {
    const shopContext = getShopContext(request);
    if (!shopContext) {
      return createErrorResponse(new AuthenticationError('Session token required'));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session, error } = await (supabase as any)
      .from('shopify_sessions')
      .select('id, shop, vapi_assistant_id, phone_number')
      .eq('shop', shopContext.shop)
      .single();

    if (error || !session) {
      return createErrorResponse(new ExternalServiceError('Shop not found - OAuth may not have completed properly', 'supabase'));
    }

    return createSuccessResponse({
      isProvisioned: !!(session.vapi_assistant_id && session.phone_number),
      assistantId: (session.vapi_assistant_id as string) || null,
      phoneNumber: (session.phone_number as string) || null,
    });
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}
