import { queryOptions } from "@tanstack/react-query";

export const SHOPIFY_API_VERSION = "2025-07";
export const SHOPIFY_STORE_PERMANENT_DOMAIN = "haven-home-3qqnp.myshopify.com";
export const SHOPIFY_STOREFRONT_TOKEN = "443232b79edadc143d6e2f0df219be13";
export const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

export interface Money {
  amount: string;
  currencyCode: string;
}

export interface SelectedOption {
  name: string;
  value: string;
}

export interface ShopifyProductVariant {
  id: string;
  title: string;
  price: Money;
  availableForSale: boolean;
  selectedOptions: SelectedOption[];
}

export interface ShopifyProductImage {
  url: string;
  altText: string | null;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  handle: string;
  priceRange: {
    minVariantPrice: Money;
  };
  images: ShopifyProductImage[];
  variants: ShopifyProductVariant[];
  options: Array<{
    name: string;
    values: string[];
  }>;
}

export interface CartItemInput {
  product: ShopifyProduct;
  variantId: string;
  variantTitle: string;
  price: Money;
  quantity: number;
  selectedOptions: SelectedOption[];
}

interface ShopifyProductsResponse {
  data?: {
    products?: {
      edges?: Array<{
        node: {
          id: string;
          title: string;
          description: string;
          handle: string;
          priceRange: {
            minVariantPrice: Money;
          };
          images?: {
            edges?: Array<{
              node: ShopifyProductImage;
            }>;
          };
          variants?: {
            edges?: Array<{
              node: ShopifyProductVariant;
            }>;
          };
          options?: Array<{
            name: string;
            values: string[];
          }>;
        };
      }>;
    };
  };
}

interface ShopifyProductByHandleResponse {
  data?: {
    product?: {
      id: string;
      title: string;
      description: string;
      handle: string;
      priceRange: {
        minVariantPrice: Money;
      };
      images?: {
        edges?: Array<{
          node: ShopifyProductImage;
        }>;
      };
      variants?: {
        edges?: Array<{
          node: ShopifyProductVariant;
        }>;
      };
      options?: Array<{
        name: string;
        values: string[];
      }>;
    } | null;
  };
}

interface CartCreateResponse {
  data?: {
    cartCreate?: {
      cart?: {
        id: string;
        checkoutUrl: string;
        lines: {
          edges: Array<{
            node: {
              id: string;
              merchandise: {
                id: string;
              };
            };
          }>;
        };
      };
      userErrors?: Array<{
        field: string[] | null;
        message: string;
      }>;
    };
  };
}

interface CartLinesResponse {
  data?: {
    cartLinesAdd?: {
      cart?: {
        lines?: {
          edges?: Array<{
            node: {
              id: string;
              merchandise: {
                id: string;
              };
            };
          }>;
        };
      };
      userErrors?: Array<{
        field: string[] | null;
        message: string;
      }>;
    };
    cartLinesUpdate?: {
      userErrors?: Array<{
        field: string[] | null;
        message: string;
      }>;
    };
    cartLinesRemove?: {
      userErrors?: Array<{
        field: string[] | null;
        message: string;
      }>;
    };
    cart?: {
      id: string;
      totalQuantity: number;
    } | null;
  };
  errors?: Array<{ message: string }>;
}

const STOREFRONT_QUERY = `
  query GetProducts($first: Int!, $query: String) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          description
          handle
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 5) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                availableForSale
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
          options {
            name
            values
          }
        }
      }
    }
  }
`;

const PRODUCT_BY_HANDLE_QUERY = `
  query ProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      description
      handle
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      images(first: 10) {
        edges {
          node {
            url
            altText
          }
        }
      }
      variants(first: 20) {
        edges {
          node {
            id
            title
            price {
              amount
              currencyCode
            }
            availableForSale
            selectedOptions {
              name
              value
            }
          }
        }
      }
      options {
        name
        values
      }
    }
  }
`;

const CART_QUERY = `
  query cart($id: ID!) {
    cart(id: $id) {
      id
      totalQuantity
    }
  }
`;

const CART_CREATE_MUTATION = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        lines(first: 100) {
          edges {
            node {
              id
              merchandise {
                ... on ProductVariant {
                  id
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CART_LINES_ADD_MUTATION = `
  mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        id
        lines(first: 100) {
          edges {
            node {
              id
              merchandise {
                ... on ProductVariant {
                  id
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CART_LINES_UPDATE_MUTATION = `
  mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CART_LINES_REMOVE_MUTATION = `
  mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

function normalizeProduct(product: NonNullable<ShopifyProductByHandleResponse["data"]>["product"]): ShopifyProduct {
  return {
    id: product?.id ?? "",
    title: product?.title ?? "",
    description: product?.description ?? "",
    handle: product?.handle ?? "",
    priceRange: {
      minVariantPrice: product?.priceRange.minVariantPrice ?? { amount: "0", currencyCode: "INR" },
    },
    images: product?.images?.edges?.map((edge) => edge.node) ?? [],
    variants: product?.variants?.edges?.map((edge) => edge.node) ?? [],
    options: product?.options ?? [],
  };
}

async function notifyBillingRequired() {
  if (typeof window === "undefined") return;
  const { toast } = await import("sonner");
  toast.error("Shopify needs an active billing plan", {
    description: "Upgrade your Shopify plan in the admin before using storefront API checkout.",
  });
}

export async function storefrontApiRequest<T>(query: string, variables: Record<string, unknown> = {}) {
  const response = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (response.status === 402) {
    await notifyBillingRequired();
    return null;
  }

  if (!response.ok) {
    throw new Error(`Shopify request failed with status ${response.status}`);
  }

  const data = (await response.json()) as T & { errors?: Array<{ message: string }> };
  if (data.errors?.length) {
    throw new Error(data.errors.map((error) => error.message).join(", "));
  }

  return data;
}

export async function fetchProducts({ first = 8, query }: { first?: number; query?: string } = {}) {
  const data = await storefrontApiRequest<ShopifyProductsResponse>(STOREFRONT_QUERY, { first, query });
  const edges = data?.data?.products?.edges ?? [];
  return edges.map((edge) => normalizeProduct(edge.node));
}

export async function fetchProductByHandle(handle: string) {
  const data = await storefrontApiRequest<ShopifyProductByHandleResponse>(PRODUCT_BY_HANDLE_QUERY, {
    handle,
  });
  const product = data?.data?.product;
  return product ? normalizeProduct(product) : null;
}

export function productsQueryOptions({ first = 8, query }: { first?: number; query?: string } = {}) {
  return queryOptions({
    queryKey: ["shopify-products", first, query ?? "all"],
    queryFn: () => fetchProducts({ first, query }),
  });
}

export function productByHandleQueryOptions(handle: string) {
  return queryOptions({
    queryKey: ["shopify-product", handle],
    queryFn: () => fetchProductByHandle(handle),
  });
}

export function formatPrice(money: Money) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: money.currencyCode,
      maximumFractionDigits: 0,
    }).format(Number(money.amount));
  } catch {
    return `${money.currencyCode} ${money.amount}`;
  }
}

export function formatCheckoutUrl(checkoutUrl: string) {
  try {
    const url = new URL(checkoutUrl);
    url.searchParams.set("channel", "online_store");
    return url.toString();
  } catch {
    return checkoutUrl;
  }
}

function isCartNotFoundError(userErrors: Array<{ field: string[] | null; message: string }>) {
  return userErrors.some(
    (error) =>
      error.message.toLowerCase().includes("cart not found") ||
      error.message.toLowerCase().includes("does not exist"),
  );
}

export async function createShopifyCart(item: CartItemInput) {
  const data = await storefrontApiRequest<CartCreateResponse>(CART_CREATE_MUTATION, {
    input: { lines: [{ quantity: item.quantity, merchandiseId: item.variantId }] },
  });

  const userErrors = data?.data?.cartCreate?.userErrors ?? [];
  if (userErrors.length > 0) {
    console.error("Cart creation failed:", userErrors);
    return null;
  }

  const cart = data?.data?.cartCreate?.cart;
  const lineId = cart?.lines.edges[0]?.node.id;
  if (!cart?.checkoutUrl || !lineId) return null;

  return {
    cartId: cart.id,
    checkoutUrl: formatCheckoutUrl(cart.checkoutUrl),
    lineId,
  };
}

export async function addLineToShopifyCart(cartId: string, item: CartItemInput) {
  const data = await storefrontApiRequest<CartLinesResponse>(CART_LINES_ADD_MUTATION, {
    cartId,
    lines: [{ quantity: item.quantity, merchandiseId: item.variantId }],
  });

  const userErrors = data?.data?.cartLinesAdd?.userErrors ?? [];
  if (isCartNotFoundError(userErrors)) return { success: false, cartNotFound: true };
  if (userErrors.length > 0) {
    console.error("Add line failed:", userErrors);
    return { success: false };
  }

  const lines = data?.data?.cartLinesAdd?.cart?.lines?.edges ?? [];
  const newLine = lines.find((line) => line.node.merchandise.id === item.variantId);
  return { success: true, lineId: newLine?.node.id };
}

export async function updateShopifyCartLine(cartId: string, lineId: string, quantity: number) {
  const data = await storefrontApiRequest<CartLinesResponse>(CART_LINES_UPDATE_MUTATION, {
    cartId,
    lines: [{ id: lineId, quantity }],
  });

  const userErrors = data?.data?.cartLinesUpdate?.userErrors ?? [];
  if (isCartNotFoundError(userErrors)) return { success: false, cartNotFound: true };
  if (userErrors.length > 0) {
    console.error("Update line failed:", userErrors);
    return { success: false };
  }

  return { success: true };
}

export async function removeLineFromShopifyCart(cartId: string, lineId: string) {
  const data = await storefrontApiRequest<CartLinesResponse>(CART_LINES_REMOVE_MUTATION, {
    cartId,
    lineIds: [lineId],
  });

  const userErrors = data?.data?.cartLinesRemove?.userErrors ?? [];
  if (isCartNotFoundError(userErrors)) return { success: false, cartNotFound: true };
  if (userErrors.length > 0) {
    console.error("Remove line failed:", userErrors);
    return { success: false };
  }

  return { success: true };
}

export async function syncShopifyCart(cartId: string) {
  const data = await storefrontApiRequest<CartLinesResponse>(CART_QUERY, { id: cartId });
  return data?.data?.cart ?? null;
}
