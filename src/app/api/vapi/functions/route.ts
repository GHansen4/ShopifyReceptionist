import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { getProducts, searchProducts } from '@/lib/shopify/admin-graphql';

// Ensure Node.js runtime for this sensitive route
export const runtime = 'nodejs';

/**
 * Check if the request is a tool call (not a conversation update)
 */
function isToolCall(body: any): boolean {
  // Accept typical tool-call shapes; reject conversation updates
  if (!body) return false;
  if (body.type === 'tool-call') return true;
  if (body.message?.type === 'tool-call') return true;
  if (body.message?.type === 'tool-calls') return true;
  if (body.toolName || body.message?.toolName) return true;
  if (body.tool?.name) return true;
  if (body.function?.name) return true;
  if (body.message?.function?.name) return true;
  if (body.message?.toolCalls?.length > 0) return true;
  return false;
}

/**
 * Extract assistant ID from headers or body with robust fallback
 */
function extractAssistantId(body: any, headers: Headers): string | undefined {
  // Prefer headers if provided by Vapi
  const hdr =
    headers.get('x-vapi-assistant-id') ||
    headers.get('x-assistant-id') ||
    undefined;
  if (hdr) return hdr;

  // Common body shapes
  return (
    body?.assistantId ||
    body?.assistant_id ||
    body?.assistant?.id ||
    body?.call?.assistantId ||
    body?.message?.assistant?.id ||
    undefined
  );
}

/**
 * Vapi Function Calling Endpoint
 * 
 * ONLY handles tool/function calls from Vapi assistants.
 * Conversation/call lifecycle events go to /api/vapi/webhook.
 * 
 * CRITICAL: Read request body EXACTLY ONCE to avoid consumption issues
 */
export async function POST(req: Request) {
  try {
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
    let body: any = {};
    try {
      body = JSON.parse(raw);
    } catch (parseError) {
      console.error('[Vapi Functions] JSON parse error:', parseError);
      return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
    }

    // ======================================================================
    // Ignore non-tool calls (conversation updates go to webhook)
    // ======================================================================
    if (!isToolCall(body)) {
      console.log('[Vapi Functions] Ignoring non-tool call:', {
        type: body?.type || body?.message?.type,
        keys: Object.keys(body || {})
      });
      return NextResponse.json({ 
        ok: true, 
        ignored: true, 
        reason: 'not-a-tool-call' 
      }, { status: 200 });
    }

    console.log('[Vapi Functions] Processing tool call');

    // ======================================================================
    // Extract assistant ID with robust fallback
    // ======================================================================
    const assistantId = extractAssistantId(body, req.headers);
    
    // Temporary diagnostics
    console.log('[Vapi Functions] Assistant ID found:', !!assistantId);
    console.log('[Vapi Functions] Available body keys:', Object.keys(body || {}));
    
    if (!assistantId) {
      console.warn('[Vapi Functions] No assistant ID found', {
        keys: Object.keys(body || {}),
        hasMessage: !!body?.message,
        rawLen: raw?.length || 0,
        headers: {
          'x-vapi-assistant-id': req.headers.get('x-vapi-assistant-id'),
          'x-assistant-id': req.headers.get('x-assistant-id')
        }
      });
      return NextResponse.json({ ok: false, error: 'NO_ASSISTANT_ID' }, { status: 400 });
    }

    console.log('[Vapi Functions] Assistant ID:', assistantId);

    // ======================================================================
    // Resolve shop by assistant ID (resilient to missing columns)
    // ======================================================================
    const { data: shop, error } = await supabaseAdmin
      .from('shops')
      .select('id, shop_domain, vapi_assistant_id, access_token, access_token_offline')
      .eq('vapi_assistant_id', assistantId)
      .maybeSingle();

    if (error) {
      console.error('[Vapi Functions] shop lookup error', error);
      return NextResponse.json({ ok: false, error: 'SHOP_LOOKUP_FAILED' }, { status: 500 });
    }

    // Type assertion for shop data
    const shopData = shop as { 
      id: string; 
      shop_domain: string; 
      access_token_offline?: string | null;
      access_token?: string | null;
      vapi_assistant_id?: string | null;
    } | null;

    // Prefer offline token; fallback to legacy access_token
    const adminToken = shopData?.access_token_offline ?? shopData?.access_token;
    if (!adminToken || !shopData) {
      console.warn('[Vapi Functions] Missing admin token for shop', shopData?.shop_domain);
      return NextResponse.json({ ok: false, error: 'MISSING_OFFLINE_TOKEN' }, { status: 401 });
    }

    // Temporary diagnostics (remove later)
    console.log('[Vapi Functions] shop=%s offline=%s legacy=%s',
      shopData?.shop_domain, !!shopData?.access_token_offline, !!shopData?.access_token);

    // ======================================================================
    // Extract tool name and arguments
    // ======================================================================
    let toolName: string | undefined;
    let args: any = {};

    // Try different possible locations for tool information
    if (body.toolName) {
      toolName = body.toolName;
      args = body.arguments || {};
    } else if (body.message?.toolName) {
      toolName = body.message.toolName;
      args = body.message.arguments || {};
    } else if (body.tool?.name) {
      toolName = body.tool.name;
      args = body.tool.arguments || {};
    } else if (body.function?.name) {
      toolName = body.function.name;
      args = body.function.arguments || {};
    } else if (body.message?.function?.name) {
      toolName = body.message.function.name;
      args = body.message.function.arguments || {};
    } else if (body.message?.toolCalls?.[0]) {
      const toolCall = body.message.toolCalls[0];
      if (toolCall.function) {
        toolName = toolCall.function.name;
        args = toolCall.function.arguments || {};
      }
    }

    if (!toolName) {
      console.warn('[Vapi Functions] No tool name found in request');
      return NextResponse.json({ 
        ok: false, 
        error: 'NO_TOOL_NAME' 
      }, { status: 400 });
    }

    console.log('[Vapi Functions] Processing tool:', toolName, 'with args:', args);

    // ======================================================================
    // Dispatch tool by name
    // ======================================================================
    let result: any;

    switch (toolName) {
      case 'search_products':
        result = await handleSearchProducts(args, {
          shopDomain: shopData.shop_domain,
          accessToken: adminToken
        });
        break;

      case 'get_products':
        result = await handleGetProducts(args, {
          shopDomain: shopData.shop_domain,
          accessToken: adminToken
        });
        break;

      case 'check_order_status':
        result = await handleCheckOrderStatus(args, {
          shopDomain: shopData.shop_domain,
          accessToken: adminToken
        });
        break;

      default:
        console.warn('[Vapi Functions] Unknown tool:', toolName);
        result = {
          error: `Unknown tool: ${toolName}`,
        };
    }

    return NextResponse.json({
      ok: true,
      result: result
    });

  } catch (e: any) {
    console.error('[Vapi Functions] Handler error:', e?.message || e);
    return NextResponse.json({ ok: false, error: 'HANDLER_EXCEPTION' }, { status: 500 });
  }
}

/**
 * Search Products Handler
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

    const products = await searchProducts({
      shopDomain: shopData.shopDomain,
      accessToken: shopData.accessToken,
      query,
      limit: parameters?.limit || 5
    });

    console.log(`[search_products] ✅ Found ${products.length} products matching "${query}"`);

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
 * Get Products Handler
 */
async function handleGetProducts(parameters: any, shopData: { shopDomain: string; accessToken: string }) {
  try {
    const limit = parameters?.limit || 5;
    
    console.log(`[get_products] Fetching ${limit} products for ${shopData.shopDomain}`);

    const products = await getProducts({
      shopDomain: shopData.shopDomain,
      accessToken: shopData.accessToken,
      limit
    });

    console.log(`[get_products] ✅ Fetched ${products.length} products`);

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
 * Check Order Status Handler
 */
async function handleCheckOrderStatus(parameters: any, shopData: { shopDomain: string; accessToken: string }) {
  try {
    const orderId = parameters?.orderId;
    
    if (!orderId) {
      return {
        error: 'Order ID is required',
      };
    }

    console.log(`[check_order_status] Checking order ${orderId} for ${shopData.shopDomain}`);

    // Order status lookup via Shopify Admin API (placeholder)
    // For now, return a placeholder response
    return {
      orderId: orderId,
      status: 'processing',
      message: 'Order status lookup not yet implemented'
    };

  } catch (error: any) {
    console.error('[check_order_status] Error:', error);
    return {
      error: 'Failed to check order status',
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
    endpoint: '/api/vapi/functions',
    purpose: 'Tool/function calls only - conversation events go to /api/vapi/webhook'
  });
}