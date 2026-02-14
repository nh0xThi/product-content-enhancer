import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

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
