import { NextRequest, NextResponse } from 'next/server';
import { SupabaseSessionStorage } from '@/lib/shopify/session-storage';
import { getShopContext } from '@/lib/shopify/context';

/**
 * Vapi Function Calling Endpoint
 * 
 * The AI calls this endpoint when it needs to fetch product information
 * during a phone conversation with a customer.
 * 
 * POST /api/vapi/functions
 * Body: {
 *   message: {
 *     type: "function-call",
 *     functionCall: {
 *       name: "get_products",
 *       parameters: { ... }
 *     }
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';
  
  try {
    // ======================================================================
    // Security: Validate API Key
    // ======================================================================
    // This endpoint is publicly accessible (called by Vapi during phone calls)
    // We use API key authentication instead of Shopify session tokens
    
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
    // Parse Request Body First
    // ======================================================================
    const body = await request.json();

    // ======================================================================
    // DEBUG: Log the complete request structure
    // ======================================================================
    console.log('[Vapi Functions] 🔍 COMPLETE REQUEST DEBUG:');
    console.log('[Vapi Functions] Headers:', {
      'content-type': request.headers.get('content-type'),
      'x-vapi-secret': request.headers.get('x-vapi-secret') ? 'present' : 'missing',
      'x-api-key': request.headers.get('x-api-key') ? 'present' : 'missing',
      'authorization': request.headers.get('authorization') ? 'present' : 'missing'
    });
    console.log('[Vapi Functions] Body structure:', {
      hasBody: !!body,
      bodyKeys: body ? Object.keys(body) : 'no body',
      bodyType: typeof body,
      bodyString: JSON.stringify(body, null, 2)
    });
    
    // Check for function call in different possible locations
    console.log('[Vapi Functions] 🔍 FUNCTION CALL SEARCH:');
    console.log('[Vapi Functions] body?.message?.functionCall:', body?.message?.functionCall);
    console.log('[Vapi Functions] body?.functionCall:', body?.functionCall);
    console.log('[Vapi Functions] body?.message:', body?.message);
    console.log('[Vapi Functions] body?.function:', body?.function);
    console.log('[Vapi Functions] body?.name:', body?.name);

    // ======================================================================
    // Get Shop Context (for Vapi calls, we need to determine shop differently)
    // ======================================================================
    // Vapi calls don't have Shopify session headers, so we need to determine
    // the shop from the assistant configuration or request context
    let shopDomain: string;
    
    // Try to get shop from request headers first (if called from Shopify app)
    const shopContext = getShopContext(request);
    if (shopContext) {
      shopDomain = shopContext.shop;
      console.log(`[Vapi Functions] Shop from context: ${shopDomain}`);
    } else {
      // For Vapi calls, we need to determine the shop from the assistant
      // We can get it from the function call parameters or use a fallback
      const functionCall = body?.message?.functionCall || body?.functionCall || body?.function;
      
      if (functionCall?.parameters?.shop) {
        shopDomain = functionCall.parameters.shop;
        console.log(`[Vapi Functions] Shop from parameters: ${shopDomain}`);
      } else {
        // Fallback to default shop (this should be configured per assistant)
        shopDomain = 'always-ai-dev-store.myshopify.com';
        console.log(`[Vapi Functions] Using fallback shop: ${shopDomain}`);
      }
    }

    // ======================================================================
    // Process Function Call
    // ======================================================================
    
    console.log('[Vapi Functions] ═══════════════════════════════════════');
    console.log('[Vapi Functions] Processing function call...');

    // Extract function call details - try multiple possible locations
    const functionCall = body?.message?.functionCall || body?.functionCall || body?.function;
    
    console.log('[Vapi Functions] 🔍 FINAL FUNCTION CALL CHECK:');
    console.log('[Vapi Functions] functionCall found:', !!functionCall);
    console.log('[Vapi Functions] functionCall value:', functionCall);
    
    if (!functionCall) {
      console.error('[Vapi Functions] ❌ No function call found in request');
      console.error('[Vapi Functions] Available body keys:', body ? Object.keys(body) : 'no body');
      console.error('[Vapi Functions] Body content:', JSON.stringify(body, null, 2));
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
        result = await handleGetProducts(parameters, shopDomain);
        break;
      
      case 'search_products':
        result = await handleSearchProducts(parameters, shopDomain);
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
 * Fetches products from Shopify
 */
async function handleGetProducts(parameters: any, shopDomain: string) {
  try {
    const limit = parameters?.limit || 5;
    const shop = shopDomain;

    console.log(`[get_products] Fetching ${limit} products for ${shop}`);

    // Load Shopify session
    const sessionStorage = new SupabaseSessionStorage();
    const sessions = await sessionStorage.findSessionsByShop(shop);

    if (!sessions || sessions.length === 0) {
      return {
        error: 'Store not authenticated',
      };
    }

    const session = sessions[0];

    if (!session.accessToken) {
      return {
        error: 'No access token found',
      };
    }

    // Fetch products from Shopify
    const apiUrl = `https://${shop}/admin/api/2024-10/products.json?limit=${limit}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': session.accessToken,
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
 * Searches products by keyword
 */
async function handleSearchProducts(parameters: any, shopDomain: string) {
  try {
    const query = parameters?.query || '';
    const shop = shopDomain;

    if (!query) {
      return {
        error: 'No search query provided',
      };
    }

    console.log(`[search_products] Searching for "${query}" in ${shop}`);

    // Load Shopify session
    const sessionStorage = new SupabaseSessionStorage();
    const sessions = await sessionStorage.findSessionsByShop(shop);

    if (!sessions || sessions.length === 0) {
      return {
        error: 'Store not authenticated',
      };
    }

    const session = sessions[0];

    if (!session.accessToken) {
      return {
        error: 'No access token found',
      };
    }

    // Search products in Shopify (using title filter)
    const apiUrl = `https://${shop}/admin/api/2024-10/products.json?title=${encodeURIComponent(query)}&limit=5`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': session.accessToken,
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
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    functions: ['get_products', 'search_products'],
    timestamp: new Date().toISOString(),
  });
}
