import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

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
