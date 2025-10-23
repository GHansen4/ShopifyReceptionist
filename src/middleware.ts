import { NextRequest, NextResponse } from 'next/server';

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

/**
 * Middleware for Shopify embedded app authentication
 * 
 * For embedded apps, authentication can come from:
 * 1. URL parameters (id_token, session) - for page loads in iframe
 * 2. Authorization header (Bearer token) - for API calls
 * 
 * We validate the presence of auth, actual validation happens in route handlers
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip validation for public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Skip validation for non-API routes (pages, static files)
  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // For API routes, check for authentication
  // Shopify provides session tokens via:
  // 1. Authorization header: "Bearer <session-token>"
  // 2. URL query params: ?id_token=<jwt>&session=<session-id>
  
  const authHeader = request.headers.get('authorization');
  const hasAuthHeader = authHeader?.startsWith('Bearer ');
  
  // Check URL parameters for Shopify session info
  const searchParams = request.nextUrl.searchParams;
  const idToken = searchParams.get('id_token');
  const session = searchParams.get('session');
  const hasSessionParams = !!(idToken || session);

  // Allow request if it has either auth header OR session parameters
  if (hasAuthHeader || hasSessionParams) {
    // Add debug logging in development
    if (process.env.NODE_ENV === 'development') {
      const authMethod = hasAuthHeader ? 'Authorization header' : 'URL parameters';
      console.log(`[Middleware] ${pathname} - Authenticated via ${authMethod}`);
    }
    
    return NextResponse.next();
  }

  // No valid authentication found
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[Middleware] ${pathname} - No authentication found`);
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'MISSING_AUTHENTICATION',
        message: 'Missing authentication. Provide either Authorization header or Shopify session parameters.',
        statusCode: 401,
      },
      timestamp: new Date().toISOString(),
    },
    { status: 401 }
  );
}

export const config = {
  matcher: ['/api/:path*'],
};
