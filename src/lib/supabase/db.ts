import { z } from 'zod';
import { supabase, supabaseAdmin } from './client';
import { ValidationError, ExternalServiceError } from '../utils/errors';

// ============================================================================
// Zod Schemas for Type Safety
// ============================================================================

export const ShopSchema = z.object({
  id: z.string().uuid(),
  shop_domain: z.string(),
  shop_name: z.string().nullable(),
  email: z.string().email().nullable(),
  timezone: z.string().default('UTC'),
  phone_number: z.string().nullable(),
  vapi_assistant_id: z.string().nullable(),
  vapi_phone_number_id: z.string().nullable(),
  settings: z.record(z.string(), z.unknown()).default({}),
  subscription_status: z.enum(['trial', 'active', 'cancelled', 'suspended']),
  plan_name: z.string(),
  call_minutes_used: z.number().int(),
  call_minutes_limit: z.number().int(),
  installed_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_at: z.string().datetime(),
});

export type Shop = z.infer<typeof ShopSchema>;

export const CallSchema = z.object({
  id: z.string().uuid(),
  shop_id: z.string().uuid(),
  vapi_call_id: z.string(),
  customer_phone: z.string(),
  customer_name: z.string().nullable(),
  duration_seconds: z.number().int(),
  cost_cents: z.number().int(),
  recording_url: z.string().nullable(),
  transcript: z.record(z.string(), z.unknown()).nullable(),
  summary: z.string().nullable(),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  resolution_status: z.enum(['resolved', 'escalated', 'abandoned']),
  tags: z.array(z.string()).nullable(),
  started_at: z.string().datetime().nullable(),
  ended_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});

export type Call = z.infer<typeof CallSchema>;

export const ProductSchema = z.object({
  id: z.string().uuid(),
  shop_id: z.string().uuid(),
  shopify_product_id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  price: z.number().nullable(),
  currency: z.string().default('USD'),
  inventory_quantity: z.number().int(),
  image_url: z.string().nullable(),
  product_url: z.string().nullable(),
  variants: z.record(z.string(), z.unknown()).nullable(),
  updated_at: z.string().datetime(),
  created_at: z.string().datetime(),
});

export type Product = z.infer<typeof ProductSchema>;

// ============================================================================
// Shop Operations
// ============================================================================

/**
 * Get shop by domain
 */
export async function getShopByDomain(domain: string): Promise<Shop | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('shops')
      .select('*')
      .eq('shop_domain', domain)
      .single();

    if (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((error as any).code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return ShopSchema.parse(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new ValidationError('Failed to parse shop data', err.flatten());
    }
    throw new ExternalServiceError('Failed to fetch shop', 'supabase', { domain });
  }
}

/**
 * Create or update shop
 * Uses supabaseAdmin to bypass RLS for OAuth operations
 */
export async function upsertShop(
  domain: string,
  accessToken: string,
  data: Partial<Omit<Shop, 'id' | 'created_at'>> = {}
): Promise<Shop> {
  try {
    console.log('[DB] Upserting shop:', domain);
    console.log('[DB] Access token received:', accessToken ? `${accessToken.substring(0, 10)}...` : 'MISSING');
    console.log('[DB] Token starts with:', accessToken?.substring(0, 6));
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error } = await (supabaseAdmin as any)
      .from('shops')
      .upsert(
        {
          shop_domain: domain,
          access_token: accessToken,
          ...data,
        },
        { onConflict: 'shop_domain' }
      )
      .select()
      .single();

    if (error) {
      console.error('[DB] Upsert error:', error);
      throw error;
    }
    
    console.log('[DB] Shop upserted successfully');
    console.log('[DB] Saved access_token starts with:', result?.access_token?.substring(0, 6));
    
    return ShopSchema.parse(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new ValidationError('Failed to parse shop data', err.flatten());
    }
    throw new ExternalServiceError('Failed to upsert shop', 'supabase', { domain });
  }
}

/**
 * Update shop settings
 */
export async function updateShopSettings(
  shopId: string,
  settings: Record<string, unknown>
): Promise<Shop> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('shops')
      .update({ settings })
      .eq('id', shopId)
      .select()
      .single();

    if (error) throw error;
    return ShopSchema.parse(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new ValidationError('Failed to parse shop data', err.flatten());
    }
    throw new ExternalServiceError('Failed to update shop settings', 'supabase', { shopId });
  }
}

// ============================================================================
// Call Operations
// ============================================================================

/**
 * Create a call record
 */
export async function createCall(callData: Omit<Call, 'id' | 'created_at'>): Promise<Call> {
  try {
    const validated = CallSchema.omit({ id: true, created_at: true }).parse(callData);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('calls')
      .insert([validated])
      .select()
      .single();

    if (error) throw error;
    return CallSchema.parse(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new ValidationError('Invalid call data', err.flatten());
    }
    throw new ExternalServiceError('Failed to create call', 'supabase');
  }
}

/**
 * Get calls for a shop with pagination
 */
export async function getShopCalls(
  shopId: string,
  limit = 20,
  offset = 0
): Promise<{ calls: Call[]; total: number }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error, count } = await (supabase as any)
      .from('calls')
      .select('*', { count: 'exact' })
      .eq('shop_id', shopId)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls = (data || []).map((call: any) => CallSchema.parse(call));
    return { calls, total: count || 0 };
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new ValidationError('Failed to parse call data', err.flatten());
    }
    throw new ExternalServiceError('Failed to fetch calls', 'supabase', { shopId });
  }
}

/**
 * Update call status and summary
 */
export async function updateCallSummary(
  callId: string,
  summary: string,
  sentiment: 'positive' | 'neutral' | 'negative',
  resolutionStatus: 'resolved' | 'escalated' | 'abandoned'
): Promise<Call> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('calls')
      .update({
        summary,
        sentiment,
        resolution_status: resolutionStatus,
      })
      .eq('id', callId)
      .select()
      .single();

    if (error) throw error;
    return CallSchema.parse(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new ValidationError('Failed to parse call data', err.flatten());
    }
    throw new ExternalServiceError('Failed to update call summary', 'supabase', { callId });
  }
}

// ============================================================================
// Product Operations
// ============================================================================

/**
 * Create or update product
 */
export async function upsertProduct(
  shopId: string,
  shopifyProductId: string,
  productData: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'shop_id' | 'shopify_product_id'>
): Promise<Product> {
  try {
    const validated = ProductSchema.omit({
      id: true,
      created_at: true,
      updated_at: true,
      shop_id: true,
      shopify_product_id: true,
    }).parse(productData);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('products')
      .upsert(
        {
          ...validated,
          shop_id: shopId,
          shopify_product_id: shopifyProductId,
        },
        { onConflict: 'shopify_product_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return ProductSchema.parse(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new ValidationError('Failed to parse product data', err.flatten());
    }
    throw new ExternalServiceError('Failed to upsert product', 'supabase');
  }
}

/**
 * Delete product
 */
export async function deleteProduct(shopifyProductId: string): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('products')
      .delete()
      .eq('shopify_product_id', shopifyProductId);

    if (error) throw error;
  } catch {
    throw new ExternalServiceError('Failed to delete product', 'supabase', {
      shopifyProductId,
    });
  }
}

/**
 * Search products by title
 */
export async function searchProducts(
  shopId: string,
  query: string,
  limit = 10
): Promise<Product[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('products')
      .select('*')
      .eq('shop_id', shopId)
      .ilike('title', `%${query}%`)
      .limit(limit);

    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((product: any) => ProductSchema.parse(product));
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new ValidationError('Failed to parse product data', err.flatten());
    }
    throw new ExternalServiceError('Failed to search products', 'supabase', {
      shopId,
      query,
    });
  }
}

// ============================================================================
// Cleanup Operations
// ============================================================================

/**
 * Delete all shop data (for uninstall)
 */
export async function deleteShop(shopId: string): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('shops').delete().eq('id', shopId);

    if (error) throw error;
  } catch {
    throw new ExternalServiceError('Failed to delete shop', 'supabase', { shopId });
  }
}
