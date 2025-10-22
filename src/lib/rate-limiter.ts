import { RateLimitError } from './utils/errors';

// ============================================================================
// Rate Limiter Interfaces
// ============================================================================

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // milliseconds
}

export interface RateLimitStatus {
  remaining: number;
  resetAt: number;
  limit: number;
}

// ============================================================================
// Base Rate Limiter Class
// ============================================================================

class RateLimiter {
  private store: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(private config: RateLimitConfig) {}

  private getKey(identifier: string): string {
    return identifier;
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, data] of this.store.entries()) {
      if (data.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  isAllowed(identifier: string): { allowed: boolean; status: RateLimitStatus } {
    this.cleanupExpired();
    const key = this.getKey(identifier);
    const now = Date.now();

    let entry = this.store.get(key);

    if (!entry || entry.resetTime < now) {
      // Create new window
      entry = {
        count: 1,
        resetTime: now + this.config.windowMs,
      };
      this.store.set(key, entry);
      return {
        allowed: true,
        status: {
          remaining: this.config.maxRequests - 1,
          resetAt: entry.resetTime,
          limit: this.config.maxRequests,
        },
      };
    }

    // Check if limit exceeded
    if (entry.count >= this.config.maxRequests) {
      return {
        allowed: false,
        status: {
          remaining: 0,
          resetAt: entry.resetTime,
          limit: this.config.maxRequests,
        },
      };
    }

    // Increment counter
    entry.count += 1;
    return {
      allowed: true,
      status: {
        remaining: this.config.maxRequests - entry.count,
        resetAt: entry.resetTime,
        limit: this.config.maxRequests,
      },
    };
  }

  reset(identifier: string): void {
    this.store.delete(this.getKey(identifier));
  }

  getStats(): { identifiers: number; entries: number } {
    this.cleanupExpired();
    return {
      identifiers: this.store.size,
      entries: this.store.size,
    };
  }
}

// ============================================================================
// Shopify API Rate Limiter
// ============================================================================

export class ShopifyRateLimiter extends RateLimiter {
  // 2 calls per second per shop (Shopify REST API limit)
  constructor() {
    super({ maxRequests: 2, windowMs: 1000 });
  }

  async executeWithLimit(
    shopId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fn: () => Promise<any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const { allowed, status } = this.isAllowed(shopId);

    if (!allowed) {
      const retryAfter = Math.ceil((status.resetAt - Date.now()) / 1000);
      console.warn(`Shopify API rate limit hit for shop ${shopId}. Retry after ${retryAfter}s`);
      throw new RateLimitError(`Shopify API rate limit exceeded. Retry after ${retryAfter}s`);
    }

    return fn();
  }

  // Monitor X-Shopify-Shop-Api-Call-Limit header
  updateFromHeader(shopId: string, limitHeader: string): RateLimitStatus | null {
    try {
      const [used, total] = limitHeader.split('/').map(Number);
      const threshold = total * 0.8; // Alert at 80% usage

      if (used >= threshold) {
        console.warn(`Shopify API approaching limit for shop ${shopId}: ${used}/${total}`);
      }

      // Return current status
      return {
        remaining: total - used,
        resetAt: Date.now() + 1000,
        limit: total,
      };
    } catch {
      return null;
    }
  }
}

// ============================================================================
// Vapi Call Rate Limiter
// ============================================================================

export class VapiRateLimiter extends RateLimiter {
  // Track calls per shop per hour
  private hourlyStore: Map<
    string,
    {
      count: number;
      resetTime: number;
      totalCostCents: number;
    }
  > = new Map();

  constructor(
    private costAlertThreshold: number = 10000 // $100 in cents
  ) {
    super({ maxRequests: 100, windowMs: 60 * 60 * 1000 });
  }

  recordCall(
    shopId: string,
    _durationSeconds: number,
    costCents: number
  ): {
    allowed: boolean;
    callsRemaining: number;
    estimatedCost: number;
  } {
    const { allowed, status } = this.isAllowed(shopId);
    const key = `vapi:${shopId}`;
    const now = Date.now();

    let entry = this.hourlyStore.get(key);
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 1,
        resetTime: now + 60 * 60 * 1000,
        totalCostCents: costCents,
      };
    } else {
      entry.count += 1;
      entry.totalCostCents += costCents;

      // Alert on cost threshold
      if (
        entry.totalCostCents >= this.costAlertThreshold &&
        entry.totalCostCents - costCents < this.costAlertThreshold
      ) {
        console.warn(
          `Vapi cost alert for shop ${shopId}: $${(entry.totalCostCents / 100).toFixed(2)} in current hour`
        );
      }
    }

    this.hourlyStore.set(key, entry);

    return {
      allowed,
      callsRemaining: status.remaining,
      estimatedCost: entry.totalCostCents,
    };
  }
}

// ============================================================================
// Webhook Rate Limiter
// ============================================================================

export class WebhookRateLimiter extends RateLimiter {
  // Max 100 webhooks per shop per minute
  constructor() {
    super({ maxRequests: 100, windowMs: 60 * 1000 });
  }

  checkLimit(shopId: string): RateLimitStatus {
    const { allowed, status } = this.isAllowed(shopId);

    if (!allowed) {
      console.warn(`Webhook rate limit hit for shop ${shopId}`);
    }

    return status;
  }
}

// ============================================================================
// Auth Rate Limiter (by IP)
// ============================================================================

export class AuthRateLimiter extends RateLimiter {
  // Max 50 OAuth attempts per IP per hour (increased for development testing)
  // Production uses strict 5 attempts per hour
  constructor() {
    const maxRequests = process.env.NODE_ENV === 'development' ? 50 : 5;
    super({ maxRequests, windowMs: 60 * 60 * 1000 });
  }

  checkAuthAttempt(ipAddress: string): { allowed: boolean; status: RateLimitStatus } {
    // Bypass rate limiting completely in development
    if (process.env.NODE_ENV === 'development') {
      return {
        allowed: true,
        status: {
          remaining: 999,
          resetAt: Date.now() + 60 * 60 * 1000,
          limit: 999,
        },
      };
    }
    return this.isAllowed(`auth:${ipAddress}`);
  }
}

// ============================================================================
// Global Limiter Instances
// ============================================================================

export const shopifyLimiter = new ShopifyRateLimiter();
export const vapiLimiter = new VapiRateLimiter();
export const webhookLimiter = new WebhookRateLimiter();
export const authLimiter = new AuthRateLimiter();

// ============================================================================
// Rate Limit Response Helpers
// ============================================================================

export function getRateLimitHeaders(status: RateLimitStatus): Record<string, string> {
  const retryAfter = Math.ceil((status.resetAt - Date.now()) / 1000);
  return {
    'RateLimit-Limit': String(status.limit),
    'RateLimit-Remaining': String(status.remaining),
    'RateLimit-Reset': String(Math.floor(status.resetAt / 1000)),
    'Retry-After': String(Math.max(1, retryAfter)),
  };
}

// ============================================================================
// Rate Limit Metrics for Monitoring
// ============================================================================

export interface RateLimitMetrics {
  shopify: { identifiers: number; entries: number };
  vapi: { identifiers: number; entries: number };
  webhook: { identifiers: number; entries: number };
  auth: { identifiers: number; entries: number };
}

export function getMetrics(): RateLimitMetrics {
  return {
    shopify: shopifyLimiter.getStats(),
    vapi: vapiLimiter.getStats(),
    webhook: webhookLimiter.getStats(),
    auth: authLimiter.getStats(),
  };
}
