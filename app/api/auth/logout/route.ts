import { NextResponse } from 'next/server';
import { destroySession, getSessionCookieName } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await destroySession(request);
    const response = NextResponse.json({ success: true });
    response.cookies.set(getSessionCookieName(), '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to log out' },
      { status: 500 }
    );
  }
}
