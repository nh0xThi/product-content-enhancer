import { NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Product } from '@/types';
import { requireStoreAccess } from '@/lib/access';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('storeId');
  const cursor = searchParams.get('cursor');
  const limitParam = searchParams.get('limit');
  const limit = Math.min(Math.max(Number(limitParam) || 250, 1), 250);

  if (!storeId) {
    return NextResponse.json(
      { error: 'storeId is required' },
      { status: 400 }
    );
  }

  try {
    const access = await requireStoreAccess(request, storeId);
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch store from database
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    if (store.status !== 'active') {
      return NextResponse.json(
        { error: 'Store is not active' },
        { status: 400 }
      );
    }

    // Extract shop domain (remove .myshopify.com if present, then add it back)
    const shopDomain = store.shop.replace(/\.myshopify\.com$/i, '');
    const accessToken = store.accessToken;
    console.log('[shopify/products] storeId:', storeId, 'shop:', store.shop, 'hasToken:', Boolean(accessToken));

    const fetchProductsQuery = async (includeCount: boolean) => {
      const response = await axios.post(
        `https://${shopDomain}.myshopify.com/admin/api/2024-10/graphql.json`,
        {
          query: `
            query getProducts($first: Int!, $after: String) {
              products(first: $first, after: $after) {
                edges {
                  node {
                    id
                    title
                    description: descriptionHtml
                    handle
                    vendor
                    productType
                    tags
                    images(first: 10) {
                      edges {
                        node {
                          id
                          url
                          altText
                        }
                      }
                    }
                    variants(first: 1) {
                      edges {
                        node {
                          id
                          price
                          title
                        }
                      }
                    }
                  }
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
              ${includeCount ? 'shop { productCount }' : ''}
            }
          `,
          variables: { first: limit, after: cursor || null }, // Shopify allows up to 250 products per query
        },
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }
      );

      const errors = (response.data as any).errors;
      return { response, errors };
    };

    let { response, errors } = await fetchProductsQuery(true);
    if (errors) {
      console.error('GraphQL errors:', errors);
      ({ response, errors } = await fetchProductsQuery(false));
    }

    if (errors) {
      console.error('GraphQL errors (retry):', errors);
      return NextResponse.json(
        { error: 'Failed to fetch products', details: errors },
        { status: 500 }
      );
    }

    // Transform GraphQL response to Product format
    const products: Product[] = response.data.data.products.edges.map((edge: any) => {
      const product = edge.node;
      return {
        id: product.id,
        title: product.title,
        description: product.description || '',
        handle: product.handle,
        vendor: product.vendor || undefined,
        productType: product.productType || undefined,
        tags: product.tags || [],
        images: product.images.edges.map((imgEdge: any) => ({
          id: imgEdge.node.id,
          url: imgEdge.node.url,
          alt: imgEdge.node.altText || '',
        })),
        price: product.variants.edges[0]?.node.price || '0',
        image: product.images.edges[0]?.node.url || undefined,
        status: undefined, // Will be populated from database if available
      };
    });

    // Fetch product statuses from database (guarded)
    const shopifyIds = products.map(p => p.id);
    let dbProducts: Array<{ shopifyId: string; status: string | null }> = [];
    try {
      const clientAny = prisma as any;
      if (clientAny && clientAny.product && typeof clientAny.product.findMany === 'function') {
        dbProducts = await clientAny.product.findMany({
          where: {
            shopifyId: {
              in: shopifyIds,
            },
            storeId,
          },
          select: {
            shopifyId: true,
            status: true,
          },
        });
      } else {
        console.warn('Prisma product delegate not available; skipping product status lookup.');
      }
    } catch (dbErr) {
      console.error('Error fetching product statuses from database:', dbErr);
      dbProducts = [];
    }

    // Create a map of shopifyId -> status
    const statusMap = new Map(dbProducts.map(p => [p.shopifyId, p.status]));

    // Fallback: derive status from latest job if product table has no status
    let jobStatusMap = new Map<string, string | null>();
    try {
      const jobRows = await prisma.$queryRaw<
        Array<{ productId: string; productStatus: string | null; status: string; createdAt: Date }>
      >(Prisma.sql`
        SELECT "productId", "productStatus", "status", "createdAt"
        FROM "jobs"
        WHERE "productId" = ANY(${shopifyIds}) AND "storeId" = ${storeId}
        ORDER BY "createdAt" DESC
      `);

      jobStatusMap = new Map<string, string | null>();
      for (const row of jobRows) {
        if (jobStatusMap.has(row.productId)) continue;
        if (row.productStatus) {
          jobStatusMap.set(row.productId, row.productStatus);
        } else if (row.status === 'completed') {
          jobStatusMap.set(row.productId, 'ai generated');
        }
      }
    } catch (jobErr) {
      console.error('Error fetching job statuses:', jobErr);
    }

    // Merge database status into products
    const productsWithStatus = products.map(product => {
      const productStatus = statusMap.get(product.id);
      const fallbackStatus = jobStatusMap.get(product.id) || undefined;
      const normalizedStatus = productStatus === 'imported' ? 'ai content imported' : productStatus;
      const normalizedFallback = fallbackStatus === 'imported' ? 'ai content imported' : fallbackStatus;
      return {
        ...product,
        status: (normalizedFallback || normalizedStatus) as 'content pass' | 'needed improve' | 'ai generated' | 'ai content imported' | undefined,
      };
    });

    return NextResponse.json({
      products: productsWithStatus,
      pageInfo: response.data.data.products.pageInfo,
      totalCount: response.data.data.shop?.productCount ?? null,
    });
  } catch (error: any) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch products',
        details: error.response?.data || error.message 
      },
      { status: 500 }
    );
  }
}
