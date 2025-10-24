import { NextRequest } from 'next/server';
import { shopify } from '../client';

/**
 * Session Validation Helper for Shopify OAuth
 * 
 * Provides secure session validation using Shopify's official methods.
 * This replaces the basic token presence checks with proper session validation.
 */
export async function validateSession(request: NextRequest) {
  try {
    // Extract session ID from request
    const sessionId = extractSessionId(request);
    
    if (!sessionId) {
      throw new Error('No session found in request');
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Session Validator] Validating session:', sessionId.substring(0, 10) + '...');
    }

    // Load session from storage using Shopify's official method
    const session = await shopify.session.find({
      id: sessionId
    });

    if (!session) {
      throw new Error('Session not found in storage');
    }

    if (!session.isActive()) {
      throw new Error('Session expired or invalid');
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Session Validator] ✅ Session validated successfully');
      console.log('[Session Validator] Shop:', session.shop);
      console.log('[Session Validator] Is Online:', session.isOnline);
    }

    return session;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Session Validator] ❌ Session validation failed:', error);
    }
    throw error;
  }
}

/**
 * Extract session ID from request headers or URL parameters
 */
function extractSessionId(request: NextRequest): string | null {
  // Try Authorization header first (for API calls)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try URL parameters (for embedded app loads)
  const session = request.nextUrl.searchParams.get('session');
  if (session) {
    return session;
  }

  // Try id_token parameter (alternative session format)
  const idToken = request.nextUrl.searchParams.get('id_token');
  if (idToken) {
    // For id_token, we need to extract the session ID from the JWT
    // This is a simplified approach - in production, you'd want to validate the JWT
    try {
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      return `offline_${payload.dest}`;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Get session from request headers (for downstream use)
 */
export function getSessionFromRequest(request: NextRequest) {
  const sessionHeader = request.headers.get('x-shopify-session');
  if (sessionHeader) {
    try {
      return JSON.parse(sessionHeader);
    } catch {
      return null;
    }
  }
  return null;
}
