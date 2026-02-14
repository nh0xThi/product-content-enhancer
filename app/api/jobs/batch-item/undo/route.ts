import { NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { requireStoreAccess } from '@/lib/access';

async function updateProductDescription(
  shopDomain: string,
  accessToken: string,
  productId: string,
  descriptionHtml: string
): Promise<boolean> {
  try {
    const mutation = `
      mutation productUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await axios.post(
      `https://${shopDomain}/admin/api/2024-10/graphql.json`,
      {
        query: mutation,
        variables: {
          input: {
            id: productId,
            descriptionHtml,
          },
        },
      },
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if ((response.data as any).errors) {
      console.error('GraphQL errors:', (response.data as any).errors);
      return false;
    }

    const userErrors = response.data.data?.productUpdate?.userErrors;
    if (userErrors && userErrors.length > 0) {
      console.error('User errors:', userErrors);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to update product:', error);
    return false;
  }
}

const extractOriginalDescription = (originalProduct: any): string => {
  if (!originalProduct) return '';
  const source = typeof originalProduct === 'string'
    ? (() => {
        try {
          return JSON.parse(originalProduct);
        } catch {
          return null;
        }
      })()
    : originalProduct;

  if (!source) return '';

  return (
    source.descriptionHtml ||
    source.description ||
    source.body_html ||
    source.bodyHtml ||
    ''
  );
};

export async function POST(request: Request) {
  try {
    const { storeId, jobId, productId } = await request.json();

    if (!storeId || !jobId || !productId) {
      return NextResponse.json({ error: 'storeId, jobId, and productId are required' }, { status: 400 });
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

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    if (job.storeId !== storeId) {
      return NextResponse.json({ error: 'Job does not belong to store' }, { status: 403 });
    }

    const original = typeof job.originalProduct === 'string'
      ? (() => {
          try {
            return JSON.parse(job.originalProduct);
          } catch {
            return null;
          }
        })()
      : job.originalProduct;

    const batchItems = original?.batch && Array.isArray(original.products) ? original.products : null;
    if (!batchItems) {
      return NextResponse.json({ error: 'Job is not a batch job' }, { status: 400 });
    }

    const itemIndex = batchItems.findIndex((item: any) => item?.productId === productId);
    if (itemIndex === -1) {
      return NextResponse.json({ error: 'Batch item not found' }, { status: 404 });
    }

    const item = batchItems[itemIndex];
    const originalDescription = extractOriginalDescription(item.originalProduct);
    if (!originalDescription) {
      return NextResponse.json({ error: 'Original description not available' }, { status: 400 });
    }

    const shopDomainBase = store.shop.replace(/\.myshopify\.com$/i, '');
    const shopDomain = `${shopDomainBase}.myshopify.com`;
    const accessToken = store.accessToken;

    const updated = await updateProductDescription(
      shopDomain,
      accessToken,
      item.productId,
      originalDescription
    );

    if (!updated) {
      return NextResponse.json({ error: 'Failed to restore product' }, { status: 500 });
    }

    const updatedItem = { ...item, productStatus: 'ai generated' };
    const updatedProducts = batchItems.slice();
    updatedProducts[itemIndex] = updatedItem;

    const updatedOriginal = {
      ...original,
      products: updatedProducts,
    };

    await prisma.job.update({
      where: { id: jobId },
      data: {
        originalProduct: updatedOriginal,
      },
    });

    try {
      const clientAny = prisma as any;
      if (clientAny && clientAny.product && typeof clientAny.product.upsert === 'function') {
        await clientAny.product.upsert({
          where: {
            shopifyId_storeId: {
              shopifyId: item.productId,
              storeId,
            },
          },
          update: { status: 'ai generated' },
          create: { shopifyId: item.productId, status: 'ai generated', storeId },
        });
      }
    } catch (uErr) {
      console.warn('Failed to update product status after undo:', uErr);
    }

    const allImported = updatedProducts.every((p: any) => p?.productStatus === 'ai content imported');
    if (!allImported) {
      try {
        await prisma.$executeRaw`
          UPDATE "jobs"
          SET "productStatus" = 'ai generated', "updatedAt" = NOW()
          WHERE "id" = ${jobId}
        `;
      } catch (updateErr) {
        console.warn('Failed to update batch job productStatus after undo:', updateErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Batch item undo error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to undo' },
      { status: 500 }
    );
  }
}
