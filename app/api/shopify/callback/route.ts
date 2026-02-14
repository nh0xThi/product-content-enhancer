import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

const API_KEY = process.env.SHOPIFY_API_KEY!;
const API_SECRET = process.env.SHOPIFY_API_SECRET!;

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const shopParam = url.searchParams.get('shop');
  const storedState = request.cookies.get('shopify_state')?.value;
  const storedShop = request.cookies.get('shopify_shop')?.value;
  
  // Extract shop name (remove .myshopify.com if present)
  let shop = shopParam?.replace('.myshopify.com', '') || storedShop;
  
  // Validate required parameters
  if (!code) {
    return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
  }
  
  if (!state) {
    return NextResponse.json({ error: 'Missing state parameter' }, { status: 400 });
  }
  
  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
  }
  
  if (state !== storedState) {
    console.error('State mismatch:', { received: state, stored: storedState });
    return NextResponse.json({ error: 'Invalid state parameter - possible CSRF attack' }, { status: 400 });
  }
  
  // Ensure shop doesn't contain .myshopify.com for the API call
  shop = shop.replace('.myshopify.com', '');

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
    }

    // Vercel always uses HTTPS, so secure should always be true
    const redirectResponse = NextResponse.redirect(new URL('/stores', request.url));
    
    console.log('Store connected successfully:', {
      shop: shopDomain,
      name: shopName,
      hasToken: !!access_token,
    });
    
    redirectResponse.cookies.set('shopify_access_token', access_token, {
      httpOnly: true,
      secure: true, // Always secure on Vercel (HTTPS)
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30days
    });
    redirectResponse.cookies.set('shopify_shop', shop, {
      httpOnly: true,
      secure: true, // Always secure on Vercel (HTTPS)
      sameSite: 'lax',
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
        stateMatches: state === storedState,
      }, 
      { status: 500 }
    );
  }
}
