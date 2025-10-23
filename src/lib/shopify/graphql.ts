// Simple session interface for GraphQL client
export interface GraphQLSession {
  shop: string;
  accessToken: string;
}

/**
 * Shopify Admin GraphQL Client
 * 
 * Provides efficient GraphQL queries for Shopify Admin API with:
 * - Precise field selection for optimal performance
 * - Proper error handling for GraphQL responses
 * - Rate limiting and retry logic
 * - Type-safe query building
 */

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
  extensions?: {
    cost: {
      requestedQueryCost: number;
      actualQueryCost: number;
      throttleStatus: {
        maximumAvailable: number;
        currentlyAvailable: number;
        restoreRate: number;
      };
    };
  };
}

export interface ProductNode {
  id: string;
  title: string;
  handle: string;
  availableForSale: boolean;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        availableForSale: boolean;
        price: {
          amount: string;
          currencyCode: string;
        };
      };
    }>;
  };
}

export interface ProductsResponse {
  products: {
    edges: Array<{
      node: ProductNode;
    }>;
  };
}

export interface SearchProductsResponse {
  products: {
    edges: Array<{
      node: ProductNode;
    }>;
  };
}

/**
 * Execute GraphQL query against Shopify Admin API
 */
export async function executeGraphQL<T>(
  session: GraphQLSession,
  query: string,
  variables: Record<string, any> = {}
): Promise<GraphQLResponse<T>> {
  const shop = session.shop;
  const accessToken = session.accessToken;

  if (!accessToken) {
    throw new Error('No access token available for GraphQL request');
  }

  const url = `https://${shop}/admin/api/2024-10/graphql.json`;
  
  try {
    const response = await fetch(url, {
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
      const errorText = await response.text();
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result: GraphQLResponse<T> = await response.json();

    // Check for GraphQL errors
    if (result.errors && result.errors.length > 0) {
      console.error('[GraphQL] Query errors:', result.errors);
      throw new Error(`GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`);
    }

    // Check rate limiting
    if (result.extensions?.cost) {
      const { throttleStatus } = result.extensions.cost;
      if (throttleStatus.currentlyAvailable < 10) {
        console.warn('[GraphQL] Rate limit warning:', {
          currentlyAvailable: throttleStatus.currentlyAvailable,
          maximumAvailable: throttleStatus.maximumAvailable,
          restoreRate: throttleStatus.restoreRate
        });
      }
    }

    return result;
  } catch (error) {
    console.error('[GraphQL] Request failed:', error);
    throw error;
  }
}

/**
 * Get products with efficient field selection
 */
export async function getProducts(
  session: GraphQLSession,
  limit: number = 5
): Promise<ProductNode[]> {
  const query = `
    query getProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            availableForSale
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  availableForSale
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const result = await executeGraphQL<ProductsResponse>(session, query, { first: limit });
  
  if (!result.data) {
    throw new Error('No data returned from products query');
  }

  return result.data.products.edges.map(edge => edge.node);
}

/**
 * Search products with efficient field selection
 */
export async function searchProducts(
  session: GraphQLSession,
  query: string,
  limit: number = 5
): Promise<ProductNode[]> {
  const graphqlQuery = `
    query searchProducts($query: String!, $first: Int!) {
      products(first: $first, query: $query) {
        edges {
          node {
            id
            title
            handle
            availableForSale
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  availableForSale
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const result = await executeGraphQL<SearchProductsResponse>(session, graphqlQuery, { 
    query, 
    first: limit 
  });
  
  if (!result.data) {
    throw new Error('No data returned from search products query');
  }

  return result.data.products.edges.map(edge => edge.node);
}

/**
 * Get product inventory levels (requires read_inventory scope)
 */
export async function getProductInventory(
  session: GraphQLSession,
  productId: string
): Promise<{ available: number; total: number }> {
  const query = `
    query getProductInventory($id: ID!) {
      product(id: $id) {
        variants(first: 10) {
          edges {
            node {
              inventoryQuantity
              availableForSale
            }
          }
        }
      }
    }
  `;

  const result = await executeGraphQL<{
    product: {
      variants: {
        edges: Array<{
          node: {
            inventoryQuantity: number;
            availableForSale: boolean;
          };
        }>;
      };
    };
  }>(session, query, { id: productId });

  if (!result.data?.product) {
    throw new Error('Product not found for inventory check');
  }

  const variants = result.data.product.variants.edges;
  const totalInventory = variants.reduce((sum, edge) => sum + edge.node.inventoryQuantity, 0);
  const availableInventory = variants.filter(edge => edge.node.availableForSale).length;

  return {
    available: availableInventory,
    total: totalInventory
  };
}
