import crypto from 'crypto';

type SessionTokenPayload = {
  iss?: string;
  dest?: string;
  aud?: string | string[];
  sub?: string;
  exp?: number;
  nbf?: number;
  iat?: number;
};

const base64UrlDecode = (input: string) => {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 ? '='.repeat(4 - (base64.length % 4)) : '';
  return Buffer.from(base64 + pad, 'base64').toString('utf8');
};

const timingSafeEqual = (a: string, b: string) => {
  const aBuf = new Uint8Array(Buffer.from(a));
  const bBuf = new Uint8Array(Buffer.from(b));
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
};

const getShopFromIssuer = (iss?: string) => {
  if (!iss) return null;
  const match = iss.match(/^https:\/\/([^/]+)\/admin$/i);
  return match ? match[1] : null;
};

export const verifyShopifySessionToken = (token: string) => {
  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  if (!apiKey || !apiSecret) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  const signatureCheck = crypto
    .createHmac('sha256', apiSecret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  if (!timingSafeEqual(signatureB64, signatureCheck)) {
    return null;
  }

  let payload: SessionTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64)) as SessionTokenPayload;
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.nbf && now < payload.nbf) return null;
  if (payload.exp && now > payload.exp) return null;

  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud || !aud.includes(apiKey)) return null;

  const shop = getShopFromIssuer(payload.iss);
  if (!shop) return null;

  return { shop, payload };
};
