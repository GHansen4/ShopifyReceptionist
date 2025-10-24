export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

/**
 * Shop-Specific Vapi Function Calling Endpoint
 * 
 * This endpoint is called by Vapi for a specific shop.
 * The shop ID is in the URL path, and we use the stored access token.
 * 
 * POST /api/vapi/functions/{shopId}
 * Body: {
 *   message: {
 *     type: "function-call",
 *     functionCall: {
 *       name: "search_products",
 *       parameters: { ... }
 *     }
 *   }
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { shopId: string } }
) {
  const supabase = getServerSupabase();
  const isDev = process.env.NODE_ENV === 'development';
  const { shopId } = params;
  
  try {
    console.log(`[Vapi Functions] Processing function call for shop: ${shopId}`);

    // ======================================================================
    // Security: Validate API Key
    // ======================================================================
    // Validate request object first
    if (!request || !request.headers) {
      console.error('[Vapi Functions] ❌ Invalid request object');
      return NextResponse.json({
        results: [{
          type: 'error',
          error: 'Invalid request object'
        }]
      }, { status: 400 });
    }

    // Support multiple authentication methods:
    // 1. X-Vapi-Secret (Vapi's preferred method)
    // 2. x-api-key (fallback)
    // 3. Authorization Bearer (fallback)
    const apiKey = request.headers.get('x-vapi-secret') || 
                   request.headers.get('x-api-key') || 
                   request.headers.get('authorization')?.replace('Bearer ', '');
    const expectedKey = process.env.VAPI_API_KEY;
    
    if (!apiKey || apiKey !== expectedKey) {
      console.error('[Vapi Functions] ❌ Unauthorized: Invalid or missing API key');
      console.error('[Vapi Functions] Headers received:', {
        'x-vapi-secret': request.headers.get('x-vapi-secret') ? 'present' : 'missing',
        'x-api-key': request.headers.get('x-api-key') ? 'present' : 'missing',
        'authorization': request.headers.get('authorization') ? 'present' : 'missing'
      });
      return NextResponse.json({
        results: [{
          error: 'Unauthorized: Invalid API key',
        }],
      }, { status: 401 });
    }
    
    if (isDev) {
      console.log('[Vapi Functions] ✅ API key validated');
    }

    // ======================================================================
    // Get Shop Data and Access Token
    // ======================================================================
    console.log(`[Vapi Functions] Fetching shop data for shopId: ${shopId}`);
    
    // Get shop data from database
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id, shop_domain, access_token_offline, access_token, vapi_assistant_id')
      .eq('id', shopId)
      .maybeSingle();

    if (shopError) {
      console.error('[SR shops read] error', shopError);
      return NextResponse.json({ ok: false, error: 'SHOP_READ_FAILED' }, { status: 500 });
    }

    if (!shop) {
      return NextResponse.json({ ok: false, error: 'SHOP_NOT_FOUND' }, { status: 404 });
    }

    // Prefer offline token; fallback to legacy access_token
    const adminToken = shop.access_token_offline ?? shop.access_token;
    if (!adminToken) {
      console.warn('[Vapi Functions] Missing admin token for shop', shop.shop_domain);
      return NextResponse.json({ ok: false, error: 'MISSING_OFFLINE_TOKEN' }, { status: 401 });
    }

    console.log(`[Vapi Functions] ✅ Found access token for shop: ${shop.shop_domain}`);

    // ======================================================================
    // Process Function Call
    // ======================================================================
    const body = await request.json();
    
    if (isDev) {
      console.log('[Vapi Functions] ═══════════════════════════════════════');
      console.log('[Vapi Functions] Received function call');
      console.log('[Vapi Functions] Body:', JSON.stringify(body, null, 2));
    }

    // Extract function call details
    const functionCall = body?.message?.functionCall;
    
    if (!functionCall) {
      console.error('[Vapi Functions] No function call found in request');
      return NextResponse.json({
        results: [{
          error: 'No function call provided',
        }],
      }, { status: 400 });
    }

    const { name, parameters } = functionCall;

    if (isDev) {
      console.log('[Vapi Functions] Function:', name);
      console.log('[Vapi Functions] Parameters:', parameters);
    }

    // Route to appropriate function handler
    let result;
    
    switch (name) {
      case 'get_products':
        result = await handleGetProducts(parameters, shop.shop_domain, adminToken);
        break;
      
      case 'search_products':
        result = await handleSearchProducts(parameters, shop.shop_domain, adminToken);
        break;
      
      default:
        console.error('[Vapi Functions] Unknown function:', name);
        result = {
          error: `Unknown function: ${name}`,
        };
    }

    if (isDev) {
      console.log('[Vapi Functions] Result:', JSON.stringify(result, null, 2));
      console.log('[Vapi Functions] ═══════════════════════════════════════');
    }

    // Return result in Vapi's expected format
    return NextResponse.json({
      results: [result],
    });

  } catch (error: any) {
    console.error('[Vapi Functions] Error:', error);
    
    return NextResponse.json({
      results: [{
        error: error.message || 'Function execution failed',
      }],
    }, { status: 500 });
  }
}

/**
 * Get Products Handler
 * Fetches products from Shopify using the shop's access token
 */
async function handleGetProducts(parameters: any, shopDomain: string, accessToken: string) {
  try {
    const limit = parameters?.limit || 5;

    console.log(`[get_products] Fetching ${limit} products for ${shopDomain}`);

    // Fetch products from Shopify using the shop's access token
    const apiUrl = `https://${shopDomain}/admin/api/2024-10/products.json?limit=${limit}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[get_products] Shopify API error:', response.status);
      return {
        error: 'Failed to fetch products from store',
      };
    }

    const data = await response.json();
    const products = data.products || [];

    console.log(`[get_products] ✅ Fetched ${products.length} products`);

    // Format products for the AI
    const formattedProducts = products.map((product: any) => ({
      title: product.title,
      description: product.body_html?.replace(/<[^>]*>/g, '').substring(0, 200) || 'No description',
      price: product.variants?.[0]?.price || 'Price varies',
      available: product.variants?.[0]?.inventory_quantity > 0,
      product_type: product.product_type,
      vendor: product.vendor,
    }));

    return {
      products: formattedProducts,
      count: formattedProducts.length,
    };

  } catch (error: any) {
    console.error('[get_products] Error:', error);
    return {
      error: 'Failed to fetch products',
    };
  }
}

/**
 * Search Products Handler
 * Searches products by keyword using the shop's access token
 */
async function handleSearchProducts(parameters: any, shopDomain: string, accessToken: string) {
  try {
    const query = parameters?.query || '';

    if (!query) {
      return {
        error: 'No search query provided',
      };
    }

    console.log(`[search_products] Searching for "${query}" in ${shopDomain}`);

    // Search products in Shopify using the shop's access token
    const apiUrl = `https://${shopDomain}/admin/api/2024-10/products.json?title=${encodeURIComponent(query)}&limit=5`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[search_products] Shopify API error:', response.status);
      return {
        error: 'Failed to search products',
      };
    }

    const data = await response.json();
    const products = data.products || [];

    console.log(`[search_products] ✅ Found ${products.length} products matching "${query}"`);

    // Format products for the AI
    const formattedProducts = products.map((product: any) => ({
      title: product.title,
      description: product.body_html?.replace(/<[^>]*>/g, '').substring(0, 200) || 'No description',
      price: product.variants?.[0]?.price || 'Price varies',
      available: product.variants?.[0]?.inventory_quantity > 0,
      product_type: product.product_type,
      vendor: product.vendor,
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
    };
  }
}

/**
 * Health check endpoint
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { shopId: string } }
) {
  return NextResponse.json({
    status: 'ok',
    shopId: params.shopId,
    functions: ['get_products', 'search_products'],
    timestamp: new Date().toISOString(),
  });
}
