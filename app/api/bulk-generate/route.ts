import { NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { requireStoreAccess } from '@/lib/access';

type Selection =
  | { mode: 'all'; cursor?: string | null; limit?: number }
  | { mode: 'ids'; ids: string[]; offset?: number; limit?: number };

export async function POST(request: Request) {
  try {
    const { storeId, structure, customPrompt, selection } = await request.json();

    if (!storeId || !structure || !selection) {
      return NextResponse.json(
        { error: 'storeId, structure, and selection are required' },
        { status: 400 }
      );
    }

    const access = await requireStoreAccess(request, storeId);
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }
    if (store.status !== 'active') {
      return NextResponse.json({ error: 'Store is not active' }, { status: 400 });
    }

    const shopDomain = store.shop.replace(/\.myshopify\.com$/i, '');
    const accessToken = store.accessToken;
    const limit = Math.min(Math.max(Number(selection.limit) || 25, 1), 250);

    const fetchProductsByCursor = async (cursor?: string | null) => {
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
            }
          `,
          variables: { first: limit, after: cursor || null },
        },
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.data.products;
    };

    const fetchProductsByIds = async (ids: string[]) => {
      const response = await axios.post(
        `https://${shopDomain}.myshopify.com/admin/api/2024-10/graphql.json`,
        {
          query: `
            query getProductsByIds($ids: [ID!]!) {
              nodes(ids: $ids) {
                ... on Product {
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
            }
          `,
          variables: { ids },
        },
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }
      );

      return (response.data.data.nodes || []).filter(Boolean);
    };

    let products: any[] = [];
    let nextCursor: string | null = null;
    let hasNextPage = false;
    let nextOffset: number | null = null;

    if (selection.mode === 'all') {
      const cursor = selection.cursor || null;
      const page = await fetchProductsByCursor(cursor);
      products = page.edges.map((edge: any) => edge.node);
      hasNextPage = Boolean(page.pageInfo?.hasNextPage);
      nextCursor = page.pageInfo?.endCursor || null;
    } else {
      const offset = Math.max(Number(selection.offset) || 0, 0);
      const idsSlice = selection.ids.slice(offset, offset + limit);
      products = await fetchProductsByIds(idsSlice);
      nextOffset = offset + idsSlice.length;
      hasNextPage = nextOffset < selection.ids.length;
    }

    if (products.length === 0) {
      return NextResponse.json({
        jobId: null,
        processedCount: 0,
        hasNextPage,
        nextCursor,
        nextOffset,
      });
    }

    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host');
    const baseUrl = host ? `${proto}://${host}` : '';

    const generationResponse = await fetch(`${baseUrl}/api/perplexity/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: request.headers.get('cookie') || '',
        authorization: request.headers.get('authorization') || '',
      },
      body: JSON.stringify({
        storeId,
        products,
        structure,
        customPrompt,
      }),
    });

    const generationData = await generationResponse.json();

    if (!generationResponse.ok) {
      return NextResponse.json(
        { error: generationData.error || 'Generation failed', details: generationData },
        { status: generationResponse.status }
      );
    }

    return NextResponse.json({
      jobId: generationData.jobId || null,
      results: generationData.results || null,
      processedCount: products.length,
      hasNextPage,
      nextCursor,
      nextOffset,
    });
  } catch (error: any) {
    console.error('Bulk generate error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process bulk generation' },
      { status: 500 }
    );
  }
}
