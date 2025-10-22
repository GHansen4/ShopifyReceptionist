import { z } from 'zod';
import { shopifyLimiter } from '../rate-limiter';
import { logError } from '../utils/errors';
import { ExternalServiceError, ValidationError } from '../utils/errors';
import { upsertProduct, deleteProduct } from '../supabase/db';

// ============================================================================
// Shopify GraphQL Query for Products
// ============================================================================

/**
 * GraphQL query to fetch products with cursor-based pagination
 * Fetches 250 products per request (Shopify max)
 */
const GET_PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String, $query: String) {
    products(first: $first, after: $after, query: $query) {
      edges {
        node {
          id
          title
          description
          handle
          vendor
          productType
          createdAt
          updatedAt
          images(first: 1) {
            edges {
              node {
                url
              }
            }
          }
          variants(first: 1) {
            edges {
              node {
                id
                title
                price
                sku
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

const ShopifyProductVariantSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.string().or(z.number()).nullable(),
  sku: z.string().nullable(),
});

const ShopifyProductImageSchema = z.object({
  url: z.string().url(),
});

const ShopifyProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  handle: z.string(),
  vendor: z.string().nullable(),
  productType: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  images: z
    .object({
      edges: z.array(
        z.object({
          node: ShopifyProductImageSchema,
        })
      ),
    })
    .optional(),
  variants: z
    .object({
      edges: z.array(
        z.object({
          node: ShopifyProductVariantSchema,
        })
      ),
    })
    .optional(),
});

type ShopifyProduct = z.infer<typeof ShopifyProductSchema>;

const ShopifyGraphQLResponseSchema = z.object({
  data: z.object({
    products: z.object({
      edges: z.array(
        z.object({
          node: ShopifyProductSchema,
          cursor: z.string(),
        })
      ),
      pageInfo: z.object({
        hasNextPage: z.boolean(),
        endCursor: z.string().nullable(),
      }),
    }),
  }),
});

// ============================================================================
// Product Sync Functions
// ============================================================================

/**
 * Extract Shopify product ID from GraphQL ID
 * GraphQL ID format: "gid://shopify/Product/1234567890"
 */
function extractShopifyProductId(graphqlId: string): string {
  const match = graphqlId.match(/Product\/(\d+)/);
  return match ? match[1] : graphqlId;
}

/**
 * Sanitize product description to remove potential XSS
 */
function sanitizeDescription(description: string | null): string | null {
  if (!description) return null;

  // Remove script tags and common XSS vectors
  return description
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe/gi, '')
    .substring(0, 500); // Limit length
}

/**
 * Fetch products from Shopify Admin API with cursor-based pagination
 * Handles rate limiting and exponential backoff
 */
export async function fetchAllProducts(
  accessToken: string,
  shopDomain: string,
  options: {
    maxProducts?: number;
    query?: string;
  } = {}
): Promise<{
  products: ShopifyProduct[];
  totalFetched: number;
  hasMore: boolean;
}> {
  const { maxProducts = Infinity, query = '' } = options;
  const allProducts: ShopifyProduct[] = [];
  let endCursor: string | null = null;
  let hasNextPage = true;
  const BATCH_SIZE = 250; // Shopify max per request

  try {
    while (hasNextPage && allProducts.length < maxProducts) {
      // Check rate limit before making request
      try {
        await shopifyLimiter.executeWithLimit(shopDomain, async () => {
          const response = await makeShopifyGraphQLRequest(
            accessToken,
            shopDomain,
            GET_PRODUCTS_QUERY,
            {
              first: Math.min(BATCH_SIZE, maxProducts - allProducts.length),
              after: endCursor,
              query: query || undefined,
            }
          );

          const validated = ShopifyGraphQLResponseSchema.parse(response);
          const { edges, pageInfo } = validated.data.products;

          // Extract and validate products
          for (const edge of edges) {
            try {
              const product = ShopifyProductSchema.parse(edge.node);
              allProducts.push(product);
            } catch (err) {
              logError(err, {
                context: 'product_validation',
                productId: edge.node.id,
              });
              // Continue with next product
            }
          }

          hasNextPage = pageInfo.hasNextPage;
          endCursor = pageInfo.endCursor;
        });
      } catch (err) {
        if (err instanceof Error && err.message.includes('rate limit')) {
          // Rate limit hit - stop here
          logError(err, {
            context: 'product_fetch_rate_limit',
            productsFetched: allProducts.length,
          });
          break;
        }
        throw err;
      }
    }

    return {
      products: allProducts,
      totalFetched: allProducts.length,
      hasMore: hasNextPage,
    };
  } catch (error) {
    logError(error, {
      context: 'fetch_all_products',
      shopDomain,
      productsFetched: allProducts.length,
    });
    throw new ExternalServiceError('Failed to fetch products from Shopify', 'shopify', {
      shopDomain,
      productsFetched: allProducts.length,
    });
  }
}

/**
 * Make GraphQL request to Shopify Admin API with retry logic
 */
async function makeShopifyGraphQLRequest(
  accessToken: string,
  shopDomain: string,
  query: string,
  variables: Record<string, unknown> = {},
  retries = 3
): Promise<unknown> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(`https://${shopDomain}/admin/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error(`Shopify API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Check for GraphQL errors
      if ((data as Record<string, unknown>).errors) {
        throw new Error(
          `GraphQL error: ${JSON.stringify((data as Record<string, unknown>).errors)}`
        );
      }

      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < retries - 1) {
        const delayMs = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Failed to fetch from Shopify API');
}

/**
 * Sync all products for a shop from Shopify to Supabase
 * Handles pagination and large catalogs
 */
export async function syncProductsForShop(
  shopId: string,
  accessToken: string,
  shopDomain: string,
  onProgress?: (fetched: number, total: number) => void
): Promise<{
  synced: number;
  deleted: number;
  errors: number;
}> {
  let synced = 0;
  const deleted = 0;
  let errors = 0;

  try {
    // Sync products from Shopify
    const { products } = await fetchAllProducts(accessToken, shopDomain, {
      maxProducts: 5000, // Reasonable limit for first sync
    });

    // Batch insert products into Supabase
    const batchSize = 50; // Insert 50 at a time
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);

      for (const product of batch) {
        try {
          const shopifyId = extractShopifyProductId(product.id);
          const imageUrl = product.images?.edges?.[0]?.node?.url || null;
          const variantPrice = product.variants?.edges?.[0]?.node?.price || null;

          // Convert price string to number if needed
          const price = typeof variantPrice === 'string' ? parseFloat(variantPrice) : variantPrice;

          await upsertProduct(shopId, shopifyId, {
            title: product.title,
            description: sanitizeDescription(product.description),
            price: price ? Math.round(price * 100) : null, // Convert to cents
            currency: 'USD',
            inventory_quantity: 0, // Would fetch from inventory API separately
            image_url: imageUrl,
            product_url: `https://${shopDomain}/products/${product.handle}`,
            variants: {
              handle: product.handle,
              vendor: product.vendor,
              productType: product.productType,
            },
          });

          synced++;
          if (onProgress) {
            onProgress(synced + deleted, products.length);
          }
        } catch (err) {
          errors++;
          logError(err, {
            context: 'product_sync_upsert',
            shopId,
            productId: product.id,
          });
        }
      }
    }

    return {
      synced,
      deleted,
      errors,
    };
  } catch (error) {
    logError(error, {
      context: 'sync_products_for_shop',
      shopId,
      shopDomain,
    });
    throw new ExternalServiceError('Failed to sync products', 'shopify', {
      shopId,
      shopDomain,
      synced,
      errors,
    });
  }
}

/**
 * Handle product creation from webhook
 */
export async function handleProductCreate(
  shopId: string,
  shopDomain: string,
  shopifyProductData: Record<string, unknown>
): Promise<void> {
  try {
    // Validate product data
    const product = ShopifyProductSchema.parse(shopifyProductData);
    const shopifyId = extractShopifyProductId(product.id);

    await upsertProduct(shopId, shopifyId, {
      title: product.title,
      description: sanitizeDescription(product.description),
      price: null,
      currency: 'USD',
      inventory_quantity: 0,
      image_url: product.images?.edges?.[0]?.node?.url || null,
      product_url: `https://${shopDomain}/products/${product.handle}`,
      variants: {
        handle: product.handle,
        vendor: product.vendor,
        productType: product.productType,
      },
    });
  } catch (error) {
    logError(error, {
      context: 'handle_product_create',
      shopId,
    });
    throw new ValidationError('Failed to handle product creation');
  }
}

/**
 * Handle product deletion from webhook
 */
export async function handleProductDelete(shopId: string, shopifyProductId: string): Promise<void> {
  try {
    await deleteProduct(shopifyProductId);
  } catch (error) {
    logError(error, {
      context: 'handle_product_delete',
      shopId,
      shopifyProductId,
    });
    throw new ExternalServiceError('Failed to handle product deletion', 'supabase');
  }
}

/**
 * Determine sync strategy based on product count
 */
export function determineSyncStrategy(estimatedCount: number): {
  immediate: number;
  deferred: boolean;
} {
  if (estimatedCount <= 500) {
    return { immediate: estimatedCount, deferred: false };
  }
  // For large catalogs: sync top 50 immediately, rest later
  return { immediate: 50, deferred: true };
}
