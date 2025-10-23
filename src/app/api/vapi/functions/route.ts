import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { getProducts, searchProducts } from '@/lib/shopify/admin-graphql';

// Ensure Node.js runtime for this sensitive route
export const runtime = 'nodejs';

/**
 * Extract assistant ID from Vapi request body
 * Supports all common Vapi payload shapes
 */
function getAssistantId(body: any): string | undefined {
  return (
    body?.assistantId ||
    body?.assistant_id ||
    body?.assistant?.id ||
    body?.call?.assistantId
  );
}

/**
 * Vapi Function Calling Endpoint
 * 
 * The AI calls this endpoint when it needs to fetch product information
 * during a phone conversation with a customer.
 * 
 * CRITICAL: Read request body EXACTLY ONCE to avoid consumption issues
 */
export async function POST(req: Request) {
  try {
    // ======================================================================
    // Content-Type validation
    // ======================================================================
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('[Vapi Functions] Invalid content-type:', contentType);
      // Continue anyway for flexibility, but log the issue
    }

    // ======================================================================
    // CRITICAL: Read raw body ONCE, parse JSON from same string
    // ======================================================================
    const raw = await req.text();
    
    // Temporary diagnostics
    console.log('[Vapi Functions] Raw body length:', raw.length);
    console.log('[Vapi Functions] Raw body preview:', raw.substring(0, 200) + (raw.length > 200 ? '...' : ''));
    
    if (!raw) {
      console.error('[Vapi Functions] Empty request body');
      return NextResponse.json({ ok: false, error: 'EMPTY_BODY' }, { status: 400 });
    }

    // Parse JSON from the same raw string
    const body = JSON.parse(raw);
    
    // ======================================================================
    // Extract assistant ID with robust fallback
    // ======================================================================
    const assistantId = getAssistantId(body);
    
    // Temporary diagnostics
    console.log('[Vapi Functions] Assistant ID found:', !!assistantId);
    console.log('[Vapi Functions] Available body keys:', Object.keys(body || {}));
    
    if (!assistantId) {
      console.warn('[Vapi Functions] No assistant ID found in request', {
        keys: Object.keys(body || {}),
        bodyStructure: {
          hasAssistant: !!body?.assistant,
          hasAssistantId: !!body?.assistantId,
          hasAssistant_id: !!body?.assistant_id,
          hasCall: !!body?.call,
          assistantKeys: body?.assistant ? Object.keys(body.assistant) : 'no assistant object',
          callKeys: body?.call ? Object.keys(body.call) : 'no call object'
        }
      });
      return NextResponse.json({ ok: false, error: 'NO_ASSISTANT_ID' }, { status: 400 });
    }

    console.log('[Vapi Functions] Assistant ID:', assistantId);

    // ======================================================================
    // Resolve shop by assistant ID
    // ======================================================================
    const { data: shop, error } = await supabaseAdmin
      .from('shops')
      .select('id, shop_domain, access_token')
      .eq('vapi_assistant_id', assistantId)
      .maybeSingle();

    // Type assertion for shop data
    const shopData = shop as { id: string; shop_domain: string; access_token: string } | null;

    // Temporary diagnostics
    console.log('[Vapi Functions] Shop lookup result:', {
      found: !!shopData,
      error: error?.message,
      hasAccessToken: !!shopData?.access_token,
      shopDomain: shopData?.shop_domain
    });

    if (error) {
      console.error('[Vapi Functions] Shop lookup error:', error);
      return NextResponse.json({ ok: false, error: 'SHOP_LOOKUP_FAILED' }, { status: 500 });
    }

    if (!shopData?.access_token) {
      console.error('[Vapi Functions] No shop found or missing access token for assistant:', assistantId);
      return NextResponse.json({ ok: false, error: 'UNKNOWN_ASSISTANT_OR_TOKEN' }, { status: 401 });
    }

    console.log('[Vapi Functions] Resolved shop:', shopData.shop_domain);

    // ======================================================================
    // Process function calls
    // ======================================================================
    
    // Extract function call from various possible locations
    let functionCall = null;
    
    // Try different message types and structures
    if (body?.message?.type === 'tool-calls' && body?.message?.toolCalls?.[0]) {
      const toolCall = body.message.toolCalls[0];
      if (toolCall.type === 'function') {
        functionCall = {
          name: toolCall.function.name,
          parameters: toolCall.function.arguments || {}
        };
      }
    } else if (body?.message?.type === 'function-call' && body?.message?.functionCall) {
      functionCall = {
        name: body.message.functionCall.name,
        parameters: body.message.functionCall.parameters || {}
      };
    } else if (body?.functionCall) {
      functionCall = {
        name: body.functionCall.name,
        parameters: body.functionCall.parameters || {}
      };
    } else if (body?.function) {
      functionCall = {
        name: body.function.name,
        parameters: body.function.parameters || {}
      };
    }

    if (!functionCall) {
      console.warn('[Vapi Functions] No function call found in request');
      return NextResponse.json({ 
        results: [{ 
          error: 'No function call provided' 
        }] 
      }, { status: 400 });
    }

    console.log('[Vapi Functions] Processing function:', functionCall.name);

    // ======================================================================
    // Execute function with explicit credentials
    // ======================================================================
    let result;
    
    if (functionCall.name === 'get_products') {
      result = await handleGetProducts(functionCall.parameters, {
        shopDomain: shopData.shop_domain,
        accessToken: shopData.access_token
      });
    } else if (functionCall.name === 'search_products') {
      result = await handleSearchProducts(functionCall.parameters, {
        shopDomain: shopData.shop_domain,
        accessToken: shopData.access_token
      });
    } else {
      result = {
        error: `Unknown function: ${functionCall.name}`,
      };
    }

    return NextResponse.json({
      results: [result],
    });

  } catch (e: any) {
    console.error('[Vapi Functions] Handler error:', e?.message || e);
    return NextResponse.json({ ok: false, error: 'HANDLER_EXCEPTION' }, { status: 500 });
  }
}

/**
 * Get Products Handler
 * Fetches products from Shopify using explicit credentials
 */
async function handleGetProducts(parameters: any, shopData: { shopDomain: string; accessToken: string }) {
  try {
    const limit = parameters?.limit || 5;
    
    console.log(`[get_products] Fetching ${limit} products for ${shopData.shopDomain}`);

    // Use adminGraphQL with explicit credentials
    const products = await getProducts({
      shopDomain: shopData.shopDomain,
      accessToken: shopData.accessToken,
      limit
    });

    console.log(`[get_products] ✅ Fetched ${products.length} products via GraphQL`);

    // Format products for the AI
    const formattedProducts = products.map((product) => ({
      title: product.title,
      description: 'Product available in store',
      price: product.priceRange.minVariantPrice.amount,
      currency: product.priceRange.minVariantPrice.currencyCode,
      available: product.availableForSale,
      handle: product.handle,
      variants: product.variants.edges.map(edge => ({
        title: edge.node.title,
        price: edge.node.price.amount,
        currency: edge.node.price.currencyCode,
        available: edge.node.availableForSale
      }))
    }));

    return {
      products: formattedProducts,
      count: formattedProducts.length,
    };

  } catch (error: any) {
    console.error('[get_products] Error:', error);
    return {
      error: 'Failed to fetch products',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Search Products Handler
 * Searches products by keyword using explicit credentials
 */
async function handleSearchProducts(parameters: any, shopData: { shopDomain: string; accessToken: string }) {
  try {
    const query = parameters?.query || '';
    
    if (!query) {
      return {
        error: 'Search query is required',
      };
    }

    console.log(`[search_products] Searching for "${query}" in ${shopData.shopDomain}`);

    // Use adminGraphQL with explicit credentials
    const products = await searchProducts({
      shopDomain: shopData.shopDomain,
      accessToken: shopData.accessToken,
      query,
      limit: 5
    });

    console.log(`[search_products] ✅ Found ${products.length} products matching "${query}" via GraphQL`);

    // Format products for the AI
    const formattedProducts = products.map((product) => ({
      title: product.title,
      description: 'Product available in store',
      price: product.priceRange.minVariantPrice.amount,
      currency: product.priceRange.minVariantPrice.currencyCode,
      available: product.availableForSale,
      handle: product.handle,
      variants: product.variants.edges.map(edge => ({
        title: edge.node.title,
        price: edge.node.price.amount,
        currency: edge.node.price.currencyCode,
        available: edge.node.availableForSale
      }))
    }));

    return {
      products: formattedProducts,
      count: formattedProducts.length,
      query: query,
    };

  } catch (error: any) {
    console.error('[search_products] Error:', error);
    return {
      error: 'Failed to search products',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoint: '/api/vapi/functions'
  });
}