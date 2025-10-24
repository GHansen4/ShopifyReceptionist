# OAuth Architecture Refactor Plan

## Overview

This document outlines the step-by-step plan to refactor our OAuth implementation to comply with Shopify's official standards and best practices.

## Phase 1: Critical OAuth Flow Refactoring

### Step 1: Replace Manual OAuth with Official Methods

#### 1.1 Update OAuth Initiation Route

**File:** `src/app/api/auth/route.ts`

**Current Issues:**
- Manual URL construction
- Custom state management
- Cookie-based session storage

**New Implementation:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify/client';

export async function GET(request: NextRequest) {
  const shop = request.nextUrl.searchParams.get('shop');
  
  if (!shop) {
    return NextResponse.json(
      { error: 'Shop domain is required' },
      { status: 400 }
    );
  }

  try {
    // Use official Shopify OAuth flow
    const authUrl = await shopify.auth.begin({
      shop,
      callbackPath: '/api/auth/callback',
      isOnline: false
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('[OAuth] Failed to initiate OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}
```

#### 1.2 Update OAuth Callback Route

**File:** `src/app/api/auth/callback/route.ts`

**Current Issues:**
- Manual token exchange
- Custom session creation
- Inconsistent error handling

**New Implementation:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify/client';

export async function GET(request: NextRequest) {
  try {
    // Use official Shopify callback handling
    const { session } = await shopify.auth.callback({
      rawRequest: request,
      rawResponse: response
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Redirect to app with session
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('shop', session.shop);
    redirectUrl.searchParams.set('host', request.nextUrl.searchParams.get('host') || '');
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('[OAuth Callback] Error:', error);
    return NextResponse.json(
      { error: 'OAuth callback failed' },
      { status: 500 }
    );
  }
}
```

### Step 2: Implement Proper Session Validation

#### 2.1 Create Session Validation Middleware

**File:** `src/lib/shopify/session-validator.ts`

```typescript
import { NextRequest } from 'next/server';
import { shopify } from '../client';

export async function validateSession(request: NextRequest) {
  // Extract session from request
  const sessionId = extractSessionId(request);
  
  if (!sessionId) {
    throw new Error('No session found');
  }

  // Load session from storage
  const session = await shopify.session.find({
    id: sessionId
  });

  if (!session) {
    throw new Error('Session not found');
  }

  if (!session.isActive()) {
    throw new Error('Session expired');
  }

  return session;
}

function extractSessionId(request: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try URL parameters
  const session = request.nextUrl.searchParams.get('session');
  if (session) {
    return session;
  }

  return null;
}
```

#### 2.2 Update Middleware

**File:** `src/middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/shopify/session-validator';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip validation for public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  try {
    // Validate session using official Shopify methods
    const session = await validateSession(request);
    
    // Add session to request headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-shopify-session', JSON.stringify(session));
    
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Authentication required',
        message: error.message
      },
      { status: 401 }
    );
  }
}
```

### Step 3: Update Shopify Client Configuration

#### 3.1 Enhanced Client Configuration

**File:** `src/lib/shopify/client.ts`

```typescript
import { shopifyApi, ApiVersion } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';
import { env } from '../env';
import { SupabaseSessionStorage } from './session-storage';

// Create session storage instance
const sessionStorage = new SupabaseSessionStorage();

export const shopify = shopifyApi({
  apiKey: env.SHOPIFY_API_KEY,
  apiSecretKey: env.SHOPIFY_API_SECRET,
  scopes: env.SHOPIFY_SCOPES.split(','),
  hostName: env.SHOPIFY_APP_URL.replace('https://', '').replace('http://', ''),
  hostScheme: env.SHOPIFY_APP_URL.startsWith('https') ? 'https' : 'http',
  apiVersion: ApiVersion.January25, // Latest stable version
  isEmbeddedApp: true,
  sessionStorage: sessionStorage,
  
  // Enhanced security configuration
  isPrivateApp: false,
  isCustomStoreApp: false,
  
  // Performance optimizations
  futureFlags: {
    v10_useFetchApi: true,
    v10_useNodeFetch: true,
  },
  
  // Development logging
  ...(process.env.NODE_ENV === 'development' && {
    logger: {
      level: 'info',
      log: (severity: string, message: string, ...args: any[]) => {
        console.log(`[Shopify API - ${severity}]`, message, ...args);
      },
    },
  }),
});
```

## Phase 2: Security Hardening

### Step 4: Enhanced Security Measures

#### 4.1 Implement Proper HMAC Validation

**File:** `src/lib/shopify/security.ts`

```typescript
import crypto from 'crypto';
import { env } from '../env';

export function validateHmac(params: URLSearchParams, hmac: string): boolean {
  // Remove hmac and signature from params
  const cleanParams = new URLSearchParams(params);
  cleanParams.delete('hmac');
  cleanParams.delete('signature');
  
  // Sort parameters alphabetically
  const sortedParams = Array.from(cleanParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  // Generate HMAC
  const generatedHmac = crypto
    .createHmac('sha256', env.SHOPIFY_API_SECRET)
    .update(sortedParams)
    .digest('hex');
  
  return generatedHmac === hmac;
}

export function validateWebhookHmac(body: string, hmac: string): boolean {
  const generatedHmac = crypto
    .createHmac('sha256', env.SHOPIFY_API_SECRET)
    .update(body, 'utf8')
    .digest('base64');
  
  return generatedHmac === hmac;
}
```

#### 4.2 Enhanced Rate Limiting

**File:** `src/lib/rate-limiter.ts`

```typescript
import { NextRequest } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
}

const rateLimitConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per window
  skipSuccessfulRequests: false
};

export function withRateLimit(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<Response>
) {
  // Implement rate limiting logic
  // This is a simplified version - implement proper rate limiting
  return handler(request);
}
```

## Phase 3: Embedded App Optimization

### Step 5: App Bridge Integration

#### 5.1 Enhanced App Bridge Provider

**File:** `src/components/providers/AppBridgeProvider.tsx`

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export function AppBridgeProvider({ children }: { children: React.ReactNode }) {
  const [appBridge, setAppBridge] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  
  const shop = searchParams.get('shop');
  const host = searchParams.get('host');
  const embedded = searchParams.get('embedded');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isEmbedded = embedded === '1' || window.self !== window.top;
    
    if (isEmbedded && shop && host) {
      // Initialize App Bridge with proper configuration
      import('@shopify/app-bridge').then(({ createApp }) => {
        try {
          const app = createApp({
            apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
            host,
            forceRedirect: false,
          });

          setAppBridge(app);
          setIsLoading(false);
        } catch (error) {
          console.error('[AppBridge] Initialization failed:', error);
          setIsLoading(false);
        }
      });
    } else {
      setIsLoading(false);
    }
  }, [shop, host, embedded]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}
```

### Step 6: Session Token Management

#### 6.1 Session Token Validation

**File:** `src/lib/shopify/session-token.ts`

```typescript
import { shopify } from '../client';

export async function validateSessionToken(token: string): Promise<boolean> {
  try {
    const payload = await shopify.session.decodeSessionToken(token);
    return payload && payload.exp > Date.now() / 1000;
  } catch (error) {
    console.error('[Session Token] Validation failed:', error);
    return false;
  }
}

export async function getSessionFromToken(token: string) {
  try {
    const payload = await shopify.session.decodeSessionToken(token);
    return await shopify.session.find({
      id: `offline_${payload.dest}`
    });
  } catch (error) {
    console.error('[Session Token] Failed to get session:', error);
    return null;
  }
}
```

## Implementation Timeline

### Week 1: Core OAuth Refactoring
- [ ] Replace manual OAuth with official methods
- [ ] Update session validation
- [ ] Fix callback handling
- [ ] Test basic OAuth flow

### Week 2: Security Hardening
- [ ] Implement proper HMAC validation
- [ ] Enhanced rate limiting
- [ ] Security testing
- [ ] Performance optimization

### Week 3: Embedded App Optimization
- [ ] App Bridge integration
- [ ] Session token management
- [ ] Cookie consent handling
- [ ] End-to-end testing

### Week 4: Testing and Deployment
- [ ] Comprehensive testing
- [ ] Performance validation
- [ ] Security audit
- [ ] Production deployment

## Testing Strategy

### Unit Tests
- OAuth flow validation
- Session management
- Security measures
- Error handling

### Integration Tests
- End-to-end OAuth flow
- Embedded app functionality
- Session persistence
- API integration

### Security Tests
- HMAC validation
- Session token validation
- Rate limiting
- CSRF protection

## Success Metrics

### Technical Metrics
- OAuth success rate: >99%
- Session validation accuracy: 100%
- Security vulnerability count: 0
- Performance: <2.5s LCP

### Business Metrics
- App installation success rate
- User authentication success rate
- Session persistence rate
- Error reduction rate

## Risk Mitigation

### High-Risk Areas
- Session migration (data loss risk)
- OAuth flow changes (authentication failure)
- Security implementation (vulnerability introduction)

### Mitigation Strategies
- Comprehensive testing
- Gradual rollout
- Rollback procedures
- Monitoring and alerting

## Conclusion

This refactor plan addresses all critical issues identified in the OAuth architecture analysis. The phased approach ensures minimal disruption while achieving full compliance with Shopify's standards and best practices.

**Next Steps:**
1. Review and approve the plan
2. Begin Phase 1 implementation
3. Set up testing infrastructure
4. Monitor progress and adjust as needed
