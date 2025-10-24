import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify/client';
import { createErrorResponse } from '@/lib/utils/api';
import { ValidationError } from '@/lib/utils/errors';

// Force dynamic rendering (uses query params)
export const dynamic = 'force-dynamic';

// Ensure Node.js runtime for this sensitive route
export const runtime = 'nodejs';

/**
 * Fetch products from Shopify Admin API - SHOPIFY OFFICIAL PATTERN
 * 
 * Uses Shopify's official authentication and API patterns.
 * This follows Shopify's prescribed approach for embedded apps.
 * 
 * GET /api/shopify/products?limit=5
 */
export async function GET(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';
  
  try {
    // Use Shopify's official authentication pattern
    const { session } = await shopify.authenticate.admin(request);

    if (!session) {
      return createErrorResponse(new ValidationError('Not authenticated'));
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '5';

    if (isDev) {
      console.log('[Shopify Products] ═══════════════════════════════════════════════════════');
      console.log('[Shopify Products] Fetching products for shop:', session.shop);
      console.log('[Shopify Products] Limit:', limit);
    }

    // Make authenticated request to Shopify REST API
    const apiUrl = `https://${session.shop}/admin/api/2024-10/products.json?limit=${limit}`;
    
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
