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
    const { storeId, jobIds } = await request.json();

    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json({ error: 'jobIds must be a non-empty array' }, { status: 400 });
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

    const shopDomainBase = store.shop.replace(/\.myshopify\.com$/i, '');
    const shopDomain = `${shopDomainBase}.myshopify.com`;
    const accessToken = store.accessToken;

    const jobs = await prisma.job.findMany({
      where: {
        id: {
          in: jobIds,
        },
        storeId,
      },
    });

    const jobsById = new Map(jobs.map((job) => [job.id, job]));
    let restoredCount = 0;
    let totalItems = 0;
    const errors: Array<{ jobId: string; error: string }> = [];

    for (const jobId of jobIds) {
      const job = jobsById.get(jobId);
      if (!job) {
        errors.push({ jobId, error: 'Job not found' });
        continue;
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

      const batchItems = original?.batch && Array.isArray(original.products)
        ? original.products
        : null;

      if (batchItems) {
        let batchErrors = 0;
        for (const item of batchItems) {
          totalItems += 1;
          const originalDescription = extractOriginalDescription(item.originalProduct);
          if (!originalDescription) {
            errors.push({ jobId, error: `Original description not available for product ${item.productId}` });
            batchErrors += 1;
            continue;
          }

          const updated = await updateProductDescription(
            shopDomain,
            accessToken,
            item.productId,
            originalDescription
          );

          if (!updated) {
            errors.push({ jobId, error: `Failed to restore product ${item.productId}` });
            batchErrors += 1;
            continue;
          }

          restoredCount += 1;

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
        }

        if (batchErrors === 0) {
          try {
            await prisma.$executeRaw`
              UPDATE "jobs"
              SET "productStatus" = 'ai generated', "updatedAt" = NOW()
              WHERE "id" = ${job.id}
            `;
          } catch (updateErr) {
            console.warn('Failed to update batch job productStatus after undo:', updateErr);
          }
        }

        continue;
      }

      totalItems += 1;

      const originalDescription = extractOriginalDescription(job.originalProduct);
      if (!originalDescription) {
        errors.push({ jobId, error: 'Original description not available' });
        continue;
      }

      const updated = await updateProductDescription(
        shopDomain,
        accessToken,
        job.productId,
        originalDescription
      );

      if (!updated) {
        errors.push({ jobId, error: 'Failed to restore product' });
        continue;
      }

      restoredCount += 1;

      try {
        await prisma.$executeRaw`
          UPDATE "jobs"
          SET "productStatus" = 'ai generated', "updatedAt" = NOW()
          WHERE "id" = ${job.id}
        `;
      } catch (updateErr) {
        console.warn('Failed to update job productStatus after undo:', updateErr);
      }

      try {
        const clientAny = prisma as any;
        if (clientAny && clientAny.product && typeof clientAny.product.upsert === 'function') {
          await clientAny.product.upsert({
            where: {
              shopifyId_storeId: {
                shopifyId: job.productId,
                storeId,
              },
            },
            update: { status: 'ai generated' },
            create: { shopifyId: job.productId, status: 'ai generated', storeId },
          });
        }
      } catch (uErr) {
        console.warn('Failed to update product status after undo:', uErr);
      }
    }

    return NextResponse.json({
      success: true,
      restoredCount,
      total: totalItems,
      errors,
    });
  } catch (error: any) {
    console.error('Undo error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to undo' },
      { status: 500 }
    );
  }
}
