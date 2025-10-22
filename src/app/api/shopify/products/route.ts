import { NextRequest, NextResponse } from 'next/server';
import { SupabaseSessionStorage } from '@/lib/shopify/session-storage';
import { env } from '@/lib/env';

// Force dynamic rendering (uses query params)
export const dynamic = 'force-dynamic';

/**
 * Fetch products from Shopify Admin API
 * 
 * Manually retrieves session from Supabase and makes authenticated API calls.
 * This approach works reliably with Next.js App Router.
 * 
 * GET /api/shopify/products?shop=<shop-domain>&limit=5
 */
export async function GET(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop');
    const limit = searchParams.get('limit') || '5';

    if (!shop) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing shop parameter',
        },
        { status: 400 }
      );
    }

    if (isDev) {
      console.log('[Shopify Products] ═══════════════════════════════════════════════════════');
      console.log('[Shopify Products] Fetching products for shop:', shop);
      console.log('[Shopify Products] Limit:', limit);
    }

    // Load session from Supabase
    const sessionStorage = new SupabaseSessionStorage();
    const sessions = await sessionStorage.findSessionsByShop(shop);

    if (!sessions || sessions.length === 0) {
      if (isDev) {
        console.log('[Shopify Products] ❌ No session found for shop');
      }
      return NextResponse.json(
        {
          success: false,
          error: 'Not authenticated - please complete OAuth flow first',
          hint: `Visit /api/auth?shop=${shop}`,
        },
        { status: 401 }
      );
    }

    const session = sessions[0]; // Get the first (most recent) session

    if (!session.accessToken) {
      if (isDev) {
        console.log('[Shopify Products] ❌ Session has no access token');
      }
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid session - no access token found',
          hint: 'Re-authenticate via /api/auth',
        },
        { status: 401 }
      );
    }

    if (isDev) {
      console.log('[Shopify Products] ✅ Session loaded');
      console.log('[Shopify Products] Session ID:', session.id);
      console.log('[Shopify Products] Access token:', session.accessToken.substring(0, 10) + '...');
    }

    // Make authenticated request to Shopify REST API
    const apiUrl = `https://${shop}/admin/api/2024-10/products.json?limit=${limit}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': session.accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Shopify Products] API Error:', response.status, errorText);
      
      if (response.status === 401) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid or expired access token',
            hint: 'Re-authenticate via /api/auth',
          },
          { status: 401 }
        );
      }
      
      throw new Error(`Shopify API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const products = data.products || [];

    if (isDev) {
      console.log('[Shopify Products] ✅ Fetched', products.length, 'products');
    }

    // Transform products to a simpler format
    const simplifiedProducts = products.map((product: any) => ({
      id: product.id,
      title: product.title,
      handle: product.handle,
      status: product.status,
      vendor: product.vendor,
      product_type: product.product_type,
      price: product.variants?.[0]?.price || '0.00',
      inventory_quantity: product.variants?.[0]?.inventory_quantity || 0,
      image: product.image?.src || product.images?.[0]?.src || null,
      created_at: product.created_at,
      updated_at: product.updated_at,
    }));

    if (isDev) {
      console.log('[Shopify Products] ═══════════════════════════════════════════════════════');
    }

    return NextResponse.json({
      success: true,
      data: {
        products: simplifiedProducts,
        count: simplifiedProducts.length,
        shop: session.shop,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[Shopify Products] Error:', error);
    
    // Generic error
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products',
        details: isDev ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
