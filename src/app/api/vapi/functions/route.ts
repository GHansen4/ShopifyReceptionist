import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { getProducts, searchProducts } from '@/lib/shopify/admin-graphql';

// Ensure Node.js runtime for this sensitive route
export const runtime = 'nodejs';

/**
 * Get shop data by assistant ID from database
 */
async function getShopByAssistantId(assistantId: string) {
  const { data, error } = await supabaseAdmin
    .from('shops')
    .select('shop_domain, access_token')
    .eq('vapi_assistant_id', assistantId)
    .single();

  if (error || !data) {
    console.error('[getShopByAssistantId] Shop not found:', { assistantId, error });
    return null;
  }

  return {
    shopDomain: (data as any).shop_domain,
    accessToken: (data as any).access_token
  };
}

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
    // Resolve Shop via Assistant ID (Vapi calls)
    // ======================================================================
    // Extract assistant ID from the request body
    const assistantId = body?.assistant?.id;
    
    if (!assistantId) {
      console.error('[Vapi Functions] ❌ No assistant ID found in request');
      return NextResponse.json({
        results: [{
          error: 'No assistant ID provided',
        }],
      }, { status: 400 });
    }

    console.log(`[Vapi Functions] Assistant ID: ${assistantId}`);
    
    // Resolve shop from assistant ID
    const shopData = await getShopByAssistantId(assistantId);
    
    if (!shopData) {
      console.error('[Vapi Functions] ❌ No shop found for assistant:', assistantId);
      return NextResponse.json({
        results: [{
          error: 'NO_OFFLINE_TOKEN_FOR_SHOP',
          details: 'No offline token found for shop'
        }],
      }, { status: 401 });
    }

    console.log(`[Vapi Functions] Resolved shop: ${shopData.shopDomain}, offlineToken: ${!!shopData.accessToken}`);

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
        const result = await handleGetProducts(parameters, shopData);
        return NextResponse.json({
          results: [result],
        });
      } else if (name === 'search_products') {
        console.log('[Vapi Functions] Processing search_products function...');
        const result = await handleSearchProducts(parameters, shopData);
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
      console.log(`[Vapi Functions] Processing function: ${name} with parameters:`, parameters);
      
      // Process the function call
      let result;
      if (name === 'get_products') {
        result = await handleGetProducts(parameters, shopData);
      } else if (name === 'search_products') {
        result = await handleSearchProducts(parameters, shopData);
      } else {
        result = {
          error: `Unknown function: ${name}`,
        };
      }
      
      return NextResponse.json({
        results: [result],
      });
      
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
 * Searches products by keyword
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

    console.log(`[search_products] 🔍 DEBUG: Query result:`, {
      hasSession: !!session,
      sessionError: sessionError,
      sessionShop: (session as any)?.shop || 'unknown',
      sessionAccessToken: (session as any)?.access_token ? 'present' : 'missing'
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
          availableSessions: allSessions?.map((s: any) => s.shop) || []
        }
      };
    }

    if (!(session as any).access_token) {
      console.error(`[search_products] ❌ No access token found in session`);
      return {
        error: 'No access token found',
      };
    }

    // Type assertion to fix TypeScript inference issue
    const sessionData = session as { shop: string; access_token: string };
    console.log(`[search_products] ✅ Found session for ${sessionData.shop}`);

    // Search products using GraphQL API
    try {
      const { searchProducts } = await import('@/lib/shopify/graphql');
      
      // Create session object for GraphQL client
      const graphqlSession = {
        shop: sessionData.shop,
        accessToken: sessionData.access_token,
      };

      console.log(`[search_products] 🔍 Searching products via GraphQL: "${query}"`);
      const products = await searchProducts(graphqlSession, query, 5);

      console.log(`[search_products] ✅ Found ${products.length} products matching "${query}" via GraphQL`);

      // Format products for the AI
      const formattedProducts = products.map((product) => ({
        title: product.title,
        description: 'Product available in store', // GraphQL doesn't include body_html by default
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

    } catch (graphqlError) {
      console.error('[search_products] ❌ GraphQL error:', graphqlError);
      return {
        error: 'Failed to search products via GraphQL',
        details: graphqlError instanceof Error ? graphqlError.message : 'Unknown GraphQL error',
        debug: {
          error: graphqlError instanceof Error ? graphqlError.message : 'Unknown error',
          stack: graphqlError instanceof Error ? graphqlError.stack : undefined
        }
      };
    }

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
