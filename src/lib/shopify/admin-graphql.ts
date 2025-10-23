/**
 * Shopify Admin GraphQL utility with explicit credentials
 * 
 * This utility does NOT rely on middleware-injected session data.
 * All product lookups must use explicit shopDomain and accessToken.
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
 * Execute GraphQL query against Shopify Admin API with explicit credentials
 */
export async function adminGraphQL<T>(params: {
  shopDomain: string;
  accessToken: string; // offline token
  query: string;
  variables?: Record<string, any>;
}): Promise<T> {
  const { shopDomain, accessToken, query, variables = {} } = params;

  if (!accessToken) {
    throw new Error('No access token provided for GraphQL request');
  }

  const url = `https://${shopDomain}/admin/api/2024-10/graphql.json`;
  
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
      console.error('[adminGraphQL] GraphQL request failed:', {
        status: response.status,
        statusText: response.statusText,
        shopDomain,
        errorBody: errorText
      });
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result: GraphQLResponse<T> = await response.json();

    // Check for GraphQL errors
    if (result.errors && result.errors.length > 0) {
      console.error('[adminGraphQL] Query errors:', result.errors);
      throw new Error(`GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`);
    }

    // Check rate limiting
    if (result.extensions?.cost) {
      const { throttleStatus } = result.extensions.cost;
      if (throttleStatus.currentlyAvailable < 10) {
        console.warn('[adminGraphQL] Rate limit warning:', {
          currentlyAvailable: throttleStatus.currentlyAvailable,
          maximumAvailable: throttleStatus.maximumAvailable,
          restoreRate: throttleStatus.restoreRate
        });
      }
    }

    return result.data as T;
  } catch (error) {
    console.error('[adminGraphQL] Request failed:', error);
    throw error;
  }
}

/**
 * Get products with efficient field selection using explicit credentials
 */
export async function getProducts(params: {
  shopDomain: string;
  accessToken: string;
  limit?: number;
}): Promise<ProductNode[]> {
  const { shopDomain, accessToken, limit = 5 } = params;

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

  const result = await adminGraphQL<ProductsResponse>({
    shopDomain,
    accessToken,
    query,
    variables: { first: limit }
  });
  
  if (!result) {
    throw new Error('No data returned from products query');
  }

  return result.products.edges.map(edge => edge.node);
}

/**
 * Search products with efficient field selection using explicit credentials
 */
export async function searchProducts(params: {
  shopDomain: string;
  accessToken: string;
  query: string;
  limit?: number;
}): Promise<ProductNode[]> {
  const { shopDomain, accessToken, query: searchQuery, limit = 5 } = params;

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

  const result = await adminGraphQL<SearchProductsResponse>({
    shopDomain,
    accessToken,
    query: graphqlQuery,
    variables: { 
      query: searchQuery, 
      first: limit 
    }
  });
  
  if (!result) {
    throw new Error('No data returned from search products query');
  }

  return result.products.edges.map(edge => edge.node);
}
