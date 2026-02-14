import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/access';

// GET - List all jobs
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const storeId = searchParams.get('storeId');

    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberships = await prisma.userStore.findMany({
      where: { userId: user.id },
      select: { storeId: true },
    });
    const storeIds = memberships.map((m) => m.storeId);
    if (storeIds.length === 0) {
      return NextResponse.json({ jobs: [] });
    }

    const scopedStoreIds = storeId
      ? storeIds.includes(storeId)
        ? [storeId]
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

    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await prisma.userStore.findUnique({
      where: {
        userId_storeId: {
          userId: user.id,
          storeId,
        },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
