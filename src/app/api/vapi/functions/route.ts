import { NextRequest, NextResponse } from 'next/server';
import { SupabaseSessionStorage } from '@/lib/shopify/session-storage';

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
    
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
    const expectedKey = process.env.VAPI_API_KEY;
    
    if (!apiKey || apiKey !== expectedKey) {
      console.error('[Vapi Functions] ❌ Unauthorized: Invalid or missing API key');
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
        result = await handleGetProducts(parameters);
        break;
      
      case 'search_products':
        result = await handleSearchProducts(parameters);
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
async function handleGetProducts(parameters: any) {
  try {
    const limit = parameters?.limit || 5;
    const shop = parameters?.shop || 'always-ai-dev-store.myshopify.com';

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
async function handleSearchProducts(parameters: any) {
  try {
    const query = parameters?.query || '';
    const shop = parameters?.shop || 'always-ai-dev-store.myshopify.com';

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
