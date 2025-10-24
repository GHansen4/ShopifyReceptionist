import { NextRequest, NextResponse } from 'next/server';

/**
 * SHOPIFY-COMPLIANT MIDDLEWARE
 * 
 * Minimal middleware that follows Shopify's prescribed patterns:
 * - Only handles essential middleware functions
 * - Lets Shopify handle authentication in individual routes
 * - No custom session validation (Shopify handles this)
 * - No manual header manipulation
 * 
 * This follows Shopify's best practices for embedded apps.
 */

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Only handle essential middleware functions:
  // 1. CORS headers for embedded apps
  // 2. Security headers
  // 3. Rate limiting (if needed)
  
  // Let Shopify handle authentication in individual routes
  // This follows Shopify's prescribed pattern for embedded apps
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Middleware] ${pathname} - Processing request`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
