import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/access';

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stores = await prisma.store.findMany({
      where: {
        status: 'active',
        memberships: {
          some: {
            userId: user.id,
          },
        },
      },
      orderBy: {
        connectedAt: 'desc',
      },
    });

    // Return stores without accessToken for security
    const safeStores = stores.map((store) => ({
      id: store.id,
      shop: store.shop,
      name: store.name || store.shop.replace('.myshopify.com', ''),
      connectedAt: store.connectedAt.toISOString(),
      status: store.status as 'active' | 'inactive',
    }));

    return NextResponse.json({ stores: safeStores });
  } catch (error) {
    console.error('Error fetching stores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stores' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('id');

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      );
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

    // Update status to inactive instead of deleting (soft delete)
    await prisma.store.update({
      where: { id: storeId },
      data: { status: 'inactive' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting store:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect store' },
      { status: 500 }
    );
  }
}
