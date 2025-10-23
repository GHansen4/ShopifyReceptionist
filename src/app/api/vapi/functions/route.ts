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

    // ======================================================================
    // Check Message Type First
    // ======================================================================
    const messageType = body?.message?.type;
    console.log('[Vapi Functions] 🔍 MESSAGE TYPE CHECK:');
    console.log('[Vapi Functions] Message type:', messageType);
    
    // Handle status updates (call progress notifications)
    if (messageType === 'status-update') {
      console.log('[Vapi Functions] ✅ Status update received - acknowledging');
      return NextResponse.json({
        results: [{
          message: 'Status update acknowledged',
          status: 'success'
        }],
      });
    }
    
    // Handle conversation updates (AI speaking to customer)
    if (messageType === 'conversation-update') {
      console.log('[Vapi Functions] ✅ Conversation update received - acknowledging');
      return NextResponse.json({
        results: [{
          message: 'Conversation update acknowledged',
          status: 'success'
        }],
      });
    }
    
    // Handle speech updates (AI finished speaking)
    if (messageType === 'speech-update') {
      console.log('[Vapi Functions] ✅ Speech update received - acknowledging');
      return NextResponse.json({
        results: [{
          message: 'Speech update acknowledged',
          status: 'success'
        }],
      });
    }
    
    // Handle tool calls (AI wants to fetch data - THIS IS THE FUNCTION CALL!)
    if (messageType === 'tool-calls') {
      console.log('[Vapi Functions] ✅ Tool calls received - processing function call');
      
      // Extract function call from tool calls structure
      const toolCalls = body?.message?.toolCalls || body?.message?.toolCallList;
      console.log('[Vapi Functions] Tool calls found:', toolCalls);
      
      if (!toolCalls || toolCalls.length === 0) {
        console.error('[Vapi Functions] ❌ No tool calls found in tool-calls message');
        return NextResponse.json({
          results: [{
            error: 'No tool calls provided',
          }],
        }, { status: 400 });
      }
      
      // Get the first tool call (function call)
      const toolCall = toolCalls[0];
      console.log('[Vapi Functions] Processing tool call:', toolCall);
      
      if (toolCall.type !== 'function') {
        console.error('[Vapi Functions] ❌ Tool call is not a function:', toolCall.type);
        return NextResponse.json({
          results: [{
            error: 'Tool call is not a function',
          }],
        }, { status: 400 });
      }
      
      // Extract function details
      const functionCall = {
        name: toolCall.function.name,
        parameters: toolCall.function.arguments || {}
      };
      
      console.log('[Vapi Functions] ✅ Function call extracted:', functionCall);
      
      // Continue with function processing...
      const { name, parameters } = functionCall;
      
      if (isDev) {
        console.log('[Vapi Functions] Function:', name);
        console.log('[Vapi Functions] Parameters:', parameters);
      }
      
      // Process the function call (rest of the existing logic)
      // Continue with existing function processing logic below...
      
      // Handle the function call
      if (name === 'get_products') {
        console.log('[Vapi Functions] Processing get_products function...');
        const result = await handleGetProducts(shopDomain, parameters);
        return NextResponse.json({
          results: [result],
        });
      } else if (name === 'search_products') {
        console.log('[Vapi Functions] Processing search_products function...');
        const result = await handleSearchProducts(shopDomain, parameters);
        return NextResponse.json({
          results: [result],
        });
      } else {
        console.error('[Vapi Functions] ❌ Unknown function:', name);
        return NextResponse.json({
          results: [{
            error: `Unknown function: ${name}`,
          }],
        }, { status: 400 });
      }
      
    } else if (messageType === 'function-call') {
      console.log('[Vapi Functions] ✅ Function call received - processing');
      
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
      
    } else {
      console.log('[Vapi Functions] ⚠️  Unknown message type:', messageType);
      console.log('[Vapi Functions] Available body keys:', body ? Object.keys(body) : 'no body');
      return NextResponse.json({
        results: [{
          error: `Unknown message type: ${messageType}`,
        }],
      }, { status: 400 });
    }

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
    
    // CRITICAL FIX: Ensure shopDomain is a string, not an object
    const shop = typeof shopDomain === 'string' ? shopDomain : 'always-ai-dev-store.myshopify.com';
    
    console.log(`[get_products] 🔍 DEBUG: shopDomain type: ${typeof shopDomain}`);
    console.log(`[get_products] 🔍 DEBUG: shopDomain value:`, shopDomain);
    console.log(`[get_products] 🔍 DEBUG: resolved shop: "${shop}"`);

    console.log(`[get_products] Fetching ${limit} products for ${shop}`);

    // Load Shopify session directly from shopify_sessions table
    const { supabaseAdmin } = await import('@/lib/supabase/client');
    
    // DEBUG: Log the exact shop parameter being used
    console.log(`[get_products] 🔍 DEBUG: Searching for shop: "${shop}"`);
    console.log(`[get_products] 🔍 DEBUG: Shop type: ${typeof shop}, length: ${shop?.length}`);
    
    // Try the query with detailed logging
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('shopify_sessions')
      .select('*')
      .eq('shop', shop)
      .maybeSingle();

    console.log(`[get_products] 🔍 DEBUG: Query result:`, {
      hasSession: !!session,
      sessionError: sessionError,
      sessionShop: session?.shop,
      sessionAccessToken: session?.access_token ? 'present' : 'missing'
    });

    if (sessionError) {
      console.error(`[get_products] ❌ Database error:`, sessionError);
      return {
        error: 'Database error - session lookup failed',
        details: sessionError.message
      };
    }

    if (!session) {
      console.error(`[get_products] ❌ No session found for shop: "${shop}"`);
      
      // DEBUG: Try to find any sessions to see what's in the database
      const { data: allSessions, error: allSessionsError } = await supabaseAdmin
        .from('shopify_sessions')
        .select('shop, created_at')
        .limit(5);
      
      console.log(`[get_products] 🔍 DEBUG: All sessions in database:`, {
        allSessions,
        allSessionsError,
        totalSessions: allSessions?.length || 0
      });
      
      return {
        error: 'Store not authenticated - session not found',
        debug: {
          searchedFor: shop,
          availableSessions: allSessions?.map(s => s.shop) || []
        }
      };
    }

    if (!session.access_token) {
      console.error(`[get_products] ❌ No access token found in session`);
      return {
        error: 'No access token found',
      };
    }

    console.log(`[get_products] ✅ Found session for ${session.shop}`);

    // Fetch products from Shopify
    const apiUrl = `https://${shop}/admin/api/2024-10/products.json?limit=${limit}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': session.access_token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[get_products] Shopify API error:', response.status);
      
      // DEBUG: Get detailed error information
      const errorText = await response.text();
      console.error('[get_products] 🔍 DEBUG: Shopify API error details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText,
        accessToken: session.access_token ? `${session.access_token.substring(0, 20)}...` : 'missing'
      });
      
      return {
        error: 'Failed to fetch products from store',
        details: `Shopify API error ${response.status}: ${response.statusText}`,
        debug: {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText
        }
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
    
    // CRITICAL FIX: Ensure shopDomain is a string, not an object
    const shop = typeof shopDomain === 'string' ? shopDomain : 'always-ai-dev-store.myshopify.com';
    
    console.log(`[search_products] 🔍 DEBUG: shopDomain type: ${typeof shopDomain}`);
    console.log(`[search_products] 🔍 DEBUG: shopDomain value:`, shopDomain);
    console.log(`[search_products] 🔍 DEBUG: resolved shop: "${shop}"`);

    if (!query) {
      return {
        error: 'No search query provided',
      };
    }

    console.log(`[search_products] Searching for "${query}" in ${shop}`);

    // Load Shopify session directly from shopify_sessions table
    const { supabaseAdmin } = await import('@/lib/supabase/client');
    
    // DEBUG: Log the exact shop parameter being used
    console.log(`[search_products] 🔍 DEBUG: Searching for shop: "${shop}"`);
    console.log(`[search_products] 🔍 DEBUG: Shop type: ${typeof shop}, length: ${shop?.length}`);
    
    // Try the query with detailed logging
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('shopify_sessions')
      .select('*')
      .eq('shop', shop)
      .maybeSingle();

    console.log(`[search_products] 🔍 DEBUG: Query result:`, {
      hasSession: !!session,
      sessionError: sessionError,
      sessionShop: session?.shop,
      sessionAccessToken: session?.access_token ? 'present' : 'missing'
    });

    if (sessionError) {
      console.error(`[search_products] ❌ Database error:`, sessionError);
      return {
        error: 'Database error - session lookup failed',
        details: sessionError.message
      };
    }

    if (!session) {
      console.error(`[search_products] ❌ No session found for shop: "${shop}"`);
      
      // DEBUG: Try to find any sessions to see what's in the database
      const { data: allSessions, error: allSessionsError } = await supabaseAdmin
        .from('shopify_sessions')
        .select('shop, created_at')
        .limit(5);
      
      console.log(`[search_products] 🔍 DEBUG: All sessions in database:`, {
        allSessions,
        allSessionsError,
        totalSessions: allSessions?.length || 0
      });
      
      return {
        error: 'Store not authenticated - session not found',
        debug: {
          searchedFor: shop,
          availableSessions: allSessions?.map(s => s.shop) || []
        }
      };
    }

    if (!session.access_token) {
      console.error(`[search_products] ❌ No access token found in session`);
      return {
        error: 'No access token found',
      };
    }

    console.log(`[search_products] ✅ Found session for ${session.shop}`);

    // Search products in Shopify (using title filter)
    const apiUrl = `https://${shop}/admin/api/2024-10/products.json?title=${encodeURIComponent(query)}&limit=5`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': session.access_token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[search_products] Shopify API error:', response.status);
      
      // DEBUG: Get detailed error information
      const errorText = await response.text();
      console.error('[search_products] 🔍 DEBUG: Shopify API error details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText,
        accessToken: session.access_token ? `${session.access_token.substring(0, 20)}...` : 'missing'
      });
      
      return {
        error: 'Failed to search products',
        details: `Shopify API error ${response.status}: ${response.statusText}`,
        debug: {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText
        }
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
