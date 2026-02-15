import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, getAccessibleStoreIds, requireStoreAccess } from '@/lib/access';

// GET - List all jobs
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const storeIdParam = searchParams.get('storeId');

    const storeIds = await getAccessibleStoreIds(request);
    if (!storeIds || storeIds.length === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scopedStoreIds = storeIdParam
      ? storeIds.includes(storeIdParam)
        ? [storeIdParam]
        : []
      : storeIds;
    if (scopedStoreIds.length === 0) {
      return NextResponse.json({ jobs: [] });
    }

    const jobs = await prisma.job.findMany({
      where: {
        storeId: { in: scopedStoreIds },
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new job
export async function POST(request: Request) {
  try {
    const { storeId, productId, productTitle, productVendor, productType, generatedHtml, dndData, originalProduct } = await request.json();

    if (!storeId || !productId || !productTitle) {
      return NextResponse.json(
        { error: 'storeId, product ID, and title are required' },
        { status: 400 }
      );
    }

    const access = await requireStoreAccess(request, storeId);
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const job = await prisma.job.create({
      data: {
        storeId,
        productId,
        productTitle,
        productVendor: productVendor || null,
        productType: productType || null,
        status: 'pending',
        generatedHtml: generatedHtml || null,
        dndData: dndData || null,
        originalProduct: originalProduct || null,
      },
    });

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
