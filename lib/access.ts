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
