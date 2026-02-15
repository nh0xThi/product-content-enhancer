import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/access';
import { verifyShopifySessionToken } from '@/lib/shopifySessionToken';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (tokenMatch) {
      const verified = verifyShopifySessionToken(tokenMatch[1]);
      if (verified) {
        const store = await prisma.store.findUnique({
          where: { shop: verified.shop },
        });
        if (!store || store.status !== 'active') {
          return NextResponse.json({ stores: [] });
        }
        return NextResponse.json({
          stores: [
            {
              id: store.id,
              shop: store.shop,
              name: store.name || store.shop.replace('.myshopify.com', ''),
              connectedAt: store.connectedAt.toISOString(),
              status: store.status as 'active' | 'inactive',
            },
          ],
        });
      }
    }

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
