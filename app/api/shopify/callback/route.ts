import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest, createSession, getSessionCookieName, hashPassword } from '@/lib/auth';

const API_KEY = process.env.SHOPIFY_API_KEY!;
const API_SECRET = process.env.SHOPIFY_API_SECRET!;

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const shopParam = url.searchParams.get('shop');
  const storedShop = request.cookies.get('shopify_shop')?.value;

  let shop = shopParam?.replace(/\.myshopify\.com$/i, '') || storedShop?.replace(/\.myshopify\.com$/i, '');
  if (shop) shop = shop.replace('.myshopify.com', '');

  if (!code) {
    return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
  }
  if (!state) {
    return NextResponse.json({ error: 'Missing state parameter' }, { status: 400 });
  }
  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
  }

  const stored = await prisma.oAuthState.findUnique({
    where: { shop },
  });
  if (!stored || stored.state !== state) {
    console.error('State mismatch:', { shop, hasStored: !!stored });
    await prisma.oAuthState.deleteMany({ where: { shop } }).catch(() => undefined);
    return NextResponse.json({ error: 'Invalid state parameter - possible CSRF attack' }, { status: 400 });
  }
  if (stored.expiresAt.getTime() < Date.now()) {
    await prisma.oAuthState.deleteMany({ where: { shop } }).catch(() => undefined);
    return NextResponse.json({ error: 'State expired. Please try again.' }, { status: 400 });
  }
  await prisma.oAuthState.delete({ where: { shop } }).catch(() => undefined);

  try {
    // Shopify expects form-encoded data, not JSON
    const response = await axios.post(
      `https://${shop}.myshopify.com/admin/oauth/access_token`,
      new URLSearchParams({
        client_id: API_KEY,
        client_secret: API_SECRET,
        code,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token } = response.data;

    // Fetch shop information from Shopify
    let shopName = shop;
    try {
      const shopResponse = await axios.get(
        `https://${shop}.myshopify.com/admin/api/2024-01/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': access_token,
          },
        }
      );
      shopName = shopResponse.data.shop.name || shop;
    } catch (error) {
      console.error('Error fetching shop info:', error);
      // Continue with shop name as fallback
    }

    // Save or update store in database
    const shopDomain = `${shop}.myshopify.com`;
    let storeRecord;
    try {
      storeRecord = await prisma.store.upsert({
        where: { shop: shopDomain },
        update: {
          accessToken: access_token,
          name: shopName,
          status: 'active',
          updatedAt: new Date(),
        },
        create: {
          shop: shopDomain,
          name: shopName,
          accessToken: access_token,
          status: 'active',
        },
      });
      console.log('Store saved to database:', shopDomain);
    } catch (dbError) {
      console.error('Error saving store to database:', dbError);
      // Continue with redirect even if DB save fails
      // The access token is still in cookies for immediate use
    }

    if (storeRecord) {
      if (session) {
        try {
          await prisma.userStore.upsert({
            where: {
              userId_storeId: {
                userId: session.user.id,
                storeId: storeRecord.id,
              },
            },
            update: {},
            create: {
              userId: session.user.id,
              storeId: storeRecord.id,
              role: 'admin',
            },
          });
        } catch (linkError) {
          console.error('Error linking user to store:', linkError);
        }
      } else {
        // Install flow: no existing session — create a store-scoped user and session
        const installEmail = `shopify-${storeRecord.id}@app.local`;
        let user = await prisma.user.findUnique({
          where: { email: installEmail },
        });
        if (!user) {
          const randomPassword = crypto.randomBytes(32).toString('hex');
          user = await prisma.user.create({
            data: {
              email: installEmail,
              passwordHash: hashPassword(randomPassword),
            },
          });
        }
        await prisma.userStore.upsert({
          where: {
            userId_storeId: {
              userId: user.id,
              storeId: storeRecord.id,
            },
          },
          update: {},
          create: {
            userId: user.id,
            storeId: storeRecord.id,
            role: 'admin',
          },
        });
        const { token, expiresAt } = await createSession(user.id);
        const sessionCookieName = getSessionCookieName();
        const isSecure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
        const sameSite = isSecure ? ('none' as const) : ('lax' as const);
        const redirectResponse = NextResponse.redirect(new URL('/app/dashboard', request.url));
        redirectResponse.cookies.set(sessionCookieName, token, {
          httpOnly: true,
          secure: isSecure,
          sameSite,
          path: '/',
          maxAge: 60 * 60 * 24 * 30,
          expires: expiresAt,
        });
        redirectResponse.cookies.set('shopify_access_token', access_token, {
          httpOnly: true,
          secure: isSecure,
          sameSite,
          path: '/',
          maxAge: 60 * 60 * 24 * 30,
        });
        redirectResponse.cookies.set('shopify_shop', shop, {
          httpOnly: true,
          secure: isSecure,
          sameSite,
          path: '/',
          maxAge: 60 * 60 * 24 * 30,
        });
        console.log('Store installed (sign-in with store); session created:', { shop: shopDomain });
        return redirectResponse;
      }
    }

    // Logged-in user connected another store (external flow) — redirect to stores list
    const redirectResponse = NextResponse.redirect(new URL('/stores', request.url));
    const isSecure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    const sameSite = isSecure ? ('none' as const) : ('lax' as const);
    console.log('Store connected successfully:', {
      shop: shopDomain,
      name: shopName,
      hasToken: !!access_token,
    });
    redirectResponse.cookies.set('shopify_access_token', access_token, {
      httpOnly: true,
      secure: isSecure,
      sameSite,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    redirectResponse.cookies.set('shopify_shop', shop, {
      httpOnly: true,
      secure: isSecure,
      sameSite,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return redirectResponse;
  } catch (error: any) {
    console.error('Token exchange error:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
    const errorDetails = error.response?.data || {};
    console.error('Error details:', JSON.stringify(errorDetails, null, 2));
    return NextResponse.json(
      { 
        error: 'Auth failed', 
        details: errorMessage,
        shop,
        hasCode: !!code,
        hasState: !!state,
        stateValid: !!stored,
      }, 
      { status: 500 }
    );
  }
}
