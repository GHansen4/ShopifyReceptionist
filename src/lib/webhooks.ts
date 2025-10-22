import crypto from 'crypto';
import { env } from './env';

export interface WebhookPayload {
  id: string;
  topic: string;
  created_at: string;
  [key: string]: unknown;
}

/**
 * Verifies HMAC signature of incoming webhook
 * CRITICAL: Must use timing-safe comparison to prevent timing attacks
 */
export function verifyWebhookHmac(rawBody: Buffer | string, hmacHeader: string): boolean {
  try {
    const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

    // Compute HMAC-SHA256
    const computed = crypto
      .createHmac('sha256', env.SHOPIFY_API_SECRET)
      .update(body, 'utf8')
      .digest('base64');

    // Use timing-safe comparison to prevent timing attacks
    const headerBuffer = Buffer.from(hmacHeader, 'utf8');
    const computedBuffer = Buffer.from(computed, 'utf8');

    return crypto.timingSafeEqual(headerBuffer, computedBuffer);
  } catch (error) {
    console.error('HMAC verification error:', error);
    return false;
  }
}

/**
 * Parses webhook payload from raw body
 */
export function parseWebhookPayload(body: Buffer | string): WebhookPayload | null {
  try {
    const json = typeof body === 'string' ? body : body.toString('utf8');
    return JSON.parse(json) as WebhookPayload;
  } catch (error) {
    console.error('Failed to parse webhook payload:', error);
    return null;
  }
}

/**
 * Extracts shop domain from webhook payload
 */
export function getShopFromWebhook(payload: WebhookPayload): string | null {
  // Most Shopify webhooks include myshopify_domain
  if (typeof payload.myshopify_domain === 'string') {
    return payload.myshopify_domain;
  }

  // shop/update includes domain
  if (typeof payload.domain === 'string') {
    return payload.domain;
  }

  // Fallback: check for shop object
  if (payload.shop && typeof payload.shop === 'object' && 'myshopify_domain' in payload.shop) {
    return (payload.shop as Record<string, unknown>).myshopify_domain as string;
  }

  return null;
}

/**
 * Handler for app/uninstalled webhook
 * Clean up all data for the uninstalled shop
 */
export async function handleAppUninstalled(payload: WebhookPayload, shop: string): Promise<void> {
  // Payload contains webhook metadata, currently unused but kept for future expansion
  void payload;

  console.log(`App uninstalled for shop: ${shop}`);

  // TODO: Implement cleanup logic
  // 1. Release Vapi phone number
  // 2. Delete receptionists
  // 3. Delete shop record
  // 4. Log to audit trail
}

/**
 * Handler for products/create webhook
 */
export async function handleProductCreate(payload: WebhookPayload, shop: string): Promise<void> {
  console.log(`Product created for shop ${shop}:`, payload.id);

  // TODO: Store product in database
  // 1. Extract product data
  // 2. Insert into products table
}

/**
 * Handler for products/update webhook
 */
export async function handleProductUpdate(payload: WebhookPayload, shop: string): Promise<void> {
  console.log(`Product updated for shop ${shop}:`, payload.id);

  // TODO: Update product in database
  // 1. Extract product data
  // 2. Update products table
}

/**
 * Handler for products/delete webhook
 */
export async function handleProductDelete(payload: WebhookPayload, shop: string): Promise<void> {
  console.log(`Product deleted for shop ${shop}:`, payload.id);

  // TODO: Delete product from database
  // 1. Delete from products table
}

/**
 * Handler for shop/update webhook
 */
export async function handleShopUpdate(payload: WebhookPayload, shop: string): Promise<void> {
  // Payload contains updated shop data, currently unused but kept for future expansion
  void payload;

  console.log(`Shop updated: ${shop}`);

  // TODO: Update shop information
  // 1. Extract shop data (name, email, plan, etc.)
  // 2. Update shops table
}

/**
 * Routes webhook to appropriate handler
 */
export async function routeWebhook(
  topic: string,
  payload: WebhookPayload,
  shop: string
): Promise<void> {
  switch (topic) {
    case 'app/uninstalled':
      await handleAppUninstalled(payload, shop);
      break;

    case 'products/create':
      await handleProductCreate(payload, shop);
      break;

    case 'products/update':
      await handleProductUpdate(payload, shop);
      break;

    case 'products/delete':
      await handleProductDelete(payload, shop);
      break;

    case 'shop/update':
      await handleShopUpdate(payload, shop);
      break;

    default:
      console.warn(`Unhandled webhook topic: ${topic}`);
  }
}
