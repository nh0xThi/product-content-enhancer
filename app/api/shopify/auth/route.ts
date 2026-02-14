import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSessionFromRequest } from '@/lib/auth';

const API_KEY = process.env.SHOPIFY_API_KEY!;
const SCOPES = process.env.SHOPIFY_SCOPES!;

const buildRedirectUri = (request: NextRequest) => {
  if (process.env.HOST) {
    return `${process.env.HOST.replace(/\/$/, '')}/api/shopify/callback`;
  }

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host) return null;

  const proto = request.headers.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}/api/shopify/callback`;
};

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const shopParam = url.searchParams.get('shop');

  if (!shopParam) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
  }

  // Validate shop format
  let shop = shopParam.replace(/\.myshopify\.com$/i, '');
  if (!shop || shop.length === 0) {
    return NextResponse.json({ error: 'Invalid shop parameter' }, { status: 400 });
  }

  // Validate shop name format (alphanumeric and hyphens only)
  if (!/^[a-z0-9-]+$/.test(shop)) {
    return NextResponse.json({ error: 'Invalid shop name format' }, { status: 400 });
  }

  const redirectUri = buildRedirectUri(request);
  if (!redirectUri) {
    return NextResponse.json({ error: 'Unable to resolve redirect URI' }, { status: 500 });
  }

  const state = crypto.randomBytes(16).toString('hex');

  const oauthUrl = `https://${shop}.myshopify.com/admin/oauth/authorize?client_id=${API_KEY}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  const response = NextResponse.redirect(oauthUrl);
  const isSecure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  response.cookies.set('shopify_state', state, { 
    httpOnly: true, 
    secure: isSecure, 
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10 // 10 minutes
  });
  response.cookies.set('shopify_shop', shop, { 
    httpOnly: true, 
    secure: isSecure, 
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10 // 10 minutes
  });

  return response;
}
