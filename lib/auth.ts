import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

const SESSION_COOKIE = 'pce_session';
const SESSION_TTL_DAYS = 30;
const PBKDF2_ITERATIONS = 120000;
const PBKDF2_DIGEST = 'sha256';
const HASH_KEYLEN = 32;

type SessionResult = {
  user: { id: string; email: string };
  sessionId: string;
};

const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

const parseCookies = (request: Request) => {
  const header = request.headers.get('cookie') || '';
  const pairs = header.split(/;\s*/).filter(Boolean);
  const out: Record<string, string> = {};
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    out[key] = decodeURIComponent(value);
  }
  return out;
};

export const getSessionCookieName = () => SESSION_COOKIE;

export const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, HASH_KEYLEN, PBKDF2_DIGEST);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${derived.toString('hex')}`;
};

export const verifyPassword = (password: string, stored: string) => {
  const [scheme, iterStr, salt, expected] = stored.split('$');
  if (scheme !== 'pbkdf2' || !iterStr || !salt || !expected) return false;
  const iterations = Number(iterStr);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  const derived = crypto.pbkdf2Sync(password, salt, iterations, HASH_KEYLEN, PBKDF2_DIGEST);
  const expectedBuf = Buffer.from(expected, 'hex');
  if (expectedBuf.length !== derived.length) return false;
  const derivedBytes = new Uint8Array(derived);
  const expectedBytes = new Uint8Array(expectedBuf);
  return crypto.timingSafeEqual(derivedBytes, expectedBytes);
};

export const createSession = async (userId: string) => {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
    },
  });

  return { token, sessionId: session.id, expiresAt };
};

export const getSessionFromRequest = async (request: Request): Promise<SessionResult | null> => {
  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: { select: { id: true, email: true } },
    },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  return { user: session.user, sessionId: session.id };
};

export const destroySession = async (request: Request) => {
  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE];
  if (!token) return;
  const tokenHash = hashToken(token);
  await prisma.session.deleteMany({ where: { tokenHash } });
};

export const requireSession = async (request: Request) => {
  const session = await getSessionFromRequest(request);
  if (!session) return null;
  return session;
};
