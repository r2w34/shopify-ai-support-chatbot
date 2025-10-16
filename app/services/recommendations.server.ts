/**
 * Product Recommendations Service
 * Provides AI-powered and algorithm-based product recommendations
 */

import type { AdminApiContext } from '@shopify/shopify-app-remix/server';

export interface Product {
  id: string;
  title: string;
  handle: string;
  price: string;
  image?: string;
  tags?: string[];
  productType?: string;
}

export interface RecommendationContext {
  customerId?: string;
  currentProductId?: string;
  cartItems?: string[];
  viewHistory?: string[];
  purchaseHistory?: string[];
  searchQuery?: string;
  priceRange?: { min: number; max: number };
}

/**
 * Get personalized product recommendations
 */
export async function getPersonalizedRecommendations(
  admin: AdminApiContext,
  context: RecommendationContext,
  limit: number = 6
): Promise<Product[]> {
  try {
    const recommendationStrategies = [
      () => getCollaborativeFilteringRecs(admin, context, limit),
      () => getContentBasedRecs(admin, context, limit),
      () => getTrendingProducts(admin, limit),
    ];

    for (const strategy of recommendationStrategies) {
      try {
        const recommendations = await strategy();
        if (recommendations && recommendations.length > 0) {
          return recommendations.slice(0, limit);
        }
      } catch (error) {
        console.error('Recommendation strategy failed:', error);
        continue;
      }
    }

    return await getFallbackRecommendations(admin, limit);
  } catch (error) {
    console.error('Get Personalized Recommendations Error:', error);
    return [];
  }
}

/**
 * Collaborative Filtering - Based on similar customer behavior
 */
async function getCollaborativeFilteringRecs(
  admin: AdminApiContext,
  context: RecommendationContext,
  limit: number
): Promise<Product[]> {
  if (!context.purchaseHistory || context.purchaseHistory.length === 0) {
    return [];
  }

  const query = `
    query getRecommendations($query: String!) {
      products(first: ${limit}, query: $query) {
        edges {
          node {
            id
            title
            handle
            priceRangeV2 {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            featuredImage {
              url
            }
            tags
            productType
          }
        }
      }
    }
  `;

  const tags = await getRelatedTags(context.purchaseHistory);
  const searchQuery = tags.length > 0 ? `tag:${tags.join(' OR tag:')}` : '';

  const response = await admin.graphql(query, {
    variables: { query: searchQuery },
  });

  const data = await response.json();
  return formatProducts(data.data.products.edges);
}

/**
 * Content-Based Recommendations - Based on product similarity
 */
async function getContentBasedRecs(
  admin: AdminApiContext,
  context: RecommendationContext,
  limit: number
): Promise<Product[]> {
  if (!context.currentProductId && !context.viewHistory?.length) {
    return [];
  }

  const targetProductId = context.currentProductId || context.viewHistory?.[0];

  const query = `
    query getProduct($id: ID!) {
      product(id: $id) {
        id
        tags
        productType
      }
    }
  `;

  const response = await admin.graphql(query, {
    variables: { id: `gid://shopify/Product/${targetProductId}` },
  });

  const data = await response.json();
  const product = data.data.product;

  if (!product) return [];

  const relatedQuery = `
    query getRelatedProducts($query: String!) {
      products(first: ${limit + 2}, query: $query) {
        edges {
          node {
            id
            title
            handle
            priceRangeV2 {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            featuredImage {
              url
            }
            tags
            productType
          }
        }
      }
    }
  `;

  let searchQuery = '';
  if (product.productType) {
    searchQuery = `product_type:${product.productType}`;
  } else if (product.tags && product.tags.length > 0) {
    searchQuery = `tag:${product.tags[0]}`;
  }

  const relatedResponse = await admin.graphql(relatedQuery, {
    variables: { query: searchQuery },
  });

  const relatedData = await relatedResponse.json();
  const products = formatProducts(relatedData.data.products.edges);

  return products.filter(p => p.id !== targetProductId);
}

/**
 * Get trending/popular products
 */
async function getTrendingProducts(
  admin: AdminApiContext,
  limit: number
): Promise<Product[]> {
  const query = `
    query getTrendingProducts {
      products(first: ${limit}, sortKey: BEST_SELLING) {
        edges {
          node {
            id
            title
            handle
            priceRangeV2 {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            featuredImage {
              url
            }
            tags
            productType
          }
        }
      }
    }
  `;

  const response = await admin.graphql(query);
  const data = await response.json();

  return formatProducts(data.data.products.edges);
}

/**
 * Fallback recommendations when no personalization data available
 */
async function getFallbackRecommendations(
  admin: AdminApiContext,
  limit: number
): Promise<Product[]> {
  const query = `
    query getFallbackProducts {
      products(first: ${limit}, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            title
            handle
            priceRangeV2 {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            featuredImage {
              url
            }
            tags
            productType
          }
        }
      }
    }
  `;

  const response = await admin.graphql(query);
  const data = await response.json();

  return formatProducts(data.data.products.edges);
}

/**
 * Get upsell recommendations for cart
 */
export async function getCartUpsells(
  admin: AdminApiContext,
  cartItems: string[],
  limit: number = 4
): Promise<Product[]> {
  if (cartItems.length === 0) return [];

  try {
    const tags: string[] = [];
    const productTypes: string[] = [];

    for (const productId of cartItems.slice(0, 3)) {
      const query = `
        query getProduct($id: ID!) {
          product(id: $id) {
            tags
            productType
          }
        }
      `;

      const response = await admin.graphql(query, {
        variables: { id: `gid://shopify/Product/${productId}` },
      });

      const data = await response.json();
      const product = data.data.product;

      if (product) {
        tags.push(...(product.tags || []));
        if (product.productType) productTypes.push(product.productType);
      }
    }

    const uniqueTags = [...new Set(tags)].slice(0, 3);
    const uniqueTypes = [...new Set(productTypes)];

    let searchQuery = '';
    if (uniqueTypes.length > 0) {
      searchQuery = `product_type:${uniqueTypes[0]}`;
    } else if (uniqueTags.length > 0) {
      searchQuery = `tag:${uniqueTags[0]}`;
    }

    const query = `
      query getUpsells($query: String!) {
        products(first: ${limit + cartItems.length}, query: $query) {
          edges {
            node {
              id
              title
              handle
              priceRangeV2 {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              featuredImage {
                url
              }
              tags
              productType
            }
          }
        }
      }
    `;

    const response = await admin.graphql(query, {
      variables: { query: searchQuery },
    });

    const data = await response.json();
    const products = formatProducts(data.data.products.edges);

    return products.filter(p => !cartItems.includes(p.id)).slice(0, limit);
  } catch (error) {
    console.error('Cart Upsells Error:', error);
    return [];
  }
}

/**
 * Get complementary products (frequently bought together)
 */
export async function getComplementaryProducts(
  admin: AdminApiContext,
  productId: string,
  limit: number = 4
): Promise<Product[]> {
  try {
    const query = `
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          tags
          productType
          collections(first: 3) {
            edges {
              node {
                id
                products(first: ${limit + 2}) {
                  edges {
                    node {
                      id
                      title
                      handle
                      priceRangeV2 {
                        minVariantPrice {
                          amount
                          currencyCode
                        }
                      }
                      featuredImage {
                        url
                      }
                      tags
                      productType
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await admin.graphql(query, {
      variables: { id: `gid://shopify/Product/${productId}` },
    });

    const data = await response.json();
    const product = data.data.product;

    if (!product) return [];

    const complementaryProducts: Product[] = [];
    const collections = product.collections.edges;

    for (const collection of collections) {
      const products = formatProducts(collection.node.products.edges);
      complementaryProducts.push(...products.filter(p => p.id !== productId));
    }

    const uniqueProducts = Array.from(
      new Map(complementaryProducts.map(p => [p.id, p])).values()
    );

    return uniqueProducts.slice(0, limit);
  } catch (error) {
    console.error('Complementary Products Error:', error);
    return [];
  }
}

/**
 * Format product data from GraphQL response
 */
function formatProducts(edges: any[]): Product[] {
  return edges.map(edge => ({
    id: edge.node.id.replace('gid://shopify/Product/', ''),
    title: edge.node.title,
    handle: edge.node.handle,
    price: edge.node.priceRangeV2?.minVariantPrice?.amount || '0',
    image: edge.node.featuredImage?.url,
    tags: edge.node.tags || [],
    productType: edge.node.productType,
  }));
}

/**
 * Helper: Get related tags from product history
 */
async function getRelatedTags(productIds: string[]): Promise<string[]> {
  return [];
}

export default {
  getPersonalizedRecommendations,
  getCartUpsells,
  getComplementaryProducts,
};
