import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/shopify/session-validator';

// Routes that don't require session token validation
const publicRoutes = [
  '/api/auth',          // OAuth endpoints
  '/api/webhooks',      // Shopify webhooks (validated via HMAC)
  '/api/health',        // Health check
  '/api/test',          // Test/debug endpoints (development only)
  '/api/setup',         // Setup endpoints (token management)
  '/api/vapi/test',     // Vapi test endpoints (development only)
  '/api/vapi/functions',// Vapi function calling (used by AI during calls)
  '/api/vapi/webhook',  // Vapi webhooks (call events)
];

// Pages that don't require authentication (for embedded app handling)
const publicPages = [
  '/bounce',            // Bounce page for cookie consent
];

/**
 * Enhanced Middleware for Shopify embedded app authentication
 * 
 * Uses official Shopify session validation instead of basic token presence checks.
 * This provides proper security validation for all API routes.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip validation for public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Skip validation for public pages
  if (publicPages.some(page => pathname.startsWith(page))) {
    return NextResponse.next();
  }

  // Skip validation for non-API routes (pages, static files)
  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // For API routes, validate session using official Shopify methods
  try {
    const session = await validateSession(request);
    
    // Add session to request headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-shopify-session', JSON.stringify(session));
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Middleware] ${pathname} - Session validated successfully`);
      console.log(`[Middleware] Shop: ${session.shop}`);
    }
    
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Middleware] ${pathname} - Session validation failed:`, errorMessage);
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_SESSION',
          message: 'Invalid or expired session. Please re-authenticate.',
          details: errorMessage,
          statusCode: 401,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: ['/api/:path*'],
};
