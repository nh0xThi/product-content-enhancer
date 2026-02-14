import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStoreAccess } from '@/lib/access';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, structure, customPrompt, selection } = body || {};

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

    const workerUrl = process.env.CLOUDFLARE_WORKER_URL;
    const workerSecret = process.env.CLOUDFLARE_WORKER_SECRET;

    if (!workerUrl || !workerSecret) {
      return NextResponse.json(
        { error: 'Worker configuration is missing' },
        { status: 500 }
      );
    }

    const shopDomain = store.shop.replace(/\.myshopify\.com$/i, '');
    const response = await fetch(`${workerUrl}/jobs/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': workerSecret,
      },
      body: JSON.stringify({
        storeId,
        shopDomain: `${shopDomain}.myshopify.com`,
        accessToken: store.accessToken,
        structure,
        customPrompt,
        selection,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error || 'Failed to enqueue job', details: data },
        { status: response.status }
      );
    }

    return NextResponse.json({ jobId: data.jobId });
  } catch (error: any) {
    console.error('Bulk job enqueue error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enqueue job' },
      { status: 500 }
    );
  }
}
