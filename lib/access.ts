import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { verifyShopifySessionToken } from '@/lib/shopifySessionToken';

/**
 * Multi-tenant isolation: All store-scoped data must be accessed only after
 * requireStoreAccess(request, storeId). Never trust storeId from the client
 * without this check. Session ensures the user is a member of that store
 * (UserStore); internal worker calls use a secret + storeId from job record.
 */

export const requireUser = async (request: Request) => {
  const session = await getSessionFromRequest(request);
  if (!session) return null;
  return session.user;
};

/**
 * Get store IDs the request has access to.
 * - Bearer token (Shopify session): returns the single store's id
 * - Session: returns all store IDs the user is a member of
 */
export const getAccessibleStoreIds = async (request: Request): Promise<string[] | null> => {
  const authHeader = request.headers.get('authorization') || '';
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (tokenMatch) {
    const verified = verifyShopifySessionToken(tokenMatch[1]);
    if (verified) {
      const shopDomain = verified.shop.includes('.myshopify.com')
        ? verified.shop
        : `${verified.shop.replace(/\.myshopify\.com$/i, '')}.myshopify.com`;
      const store = await prisma.store.findUnique({
        where: { shop: shopDomain, status: 'active' },
        select: { id: true },
      });
      if (store) return [store.id];
    }
  }

  const session = await getSessionFromRequest(request);
  if (!session) return null;

  const memberships = await prisma.userStore.findMany({
    where: { userId: session.user.id },
    select: { storeId: true },
  });
  return memberships.map((m) => m.storeId);
};

export const requireStoreAccess = async (request: Request, storeId: string) => {
  const authHeader = request.headers.get('authorization') || '';
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (tokenMatch) {
    const verified = verifyShopifySessionToken(tokenMatch[1]);
    if (verified) {
      const store = await prisma.store.findUnique({
        where: { shop: verified.shop },
        select: { id: true },
      });
      if (store && store.id === storeId) {
        return { user: null, membership: null };
      }
    }
  }

  const session = await getSessionFromRequest(request);
  if (!session) return null;

  const membership = await prisma.userStore.findUnique({
    where: {
      userId_storeId: {
        userId: session.user.id,
        storeId,
      },
    },
  });

  if (!membership) return null;
  return { user: session.user, membership };
};
