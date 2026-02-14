import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession, hashPassword, getSessionCookieName } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!normalizedEmail || password.length < 8) {
      return NextResponse.json(
        { error: 'Use a valid email and a password of at least 8 characters' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with that email already exists' },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: hashPassword(password),
      },
      select: { id: true, email: true },
    });

    const session = await createSession(user.id);
    const response = NextResponse.json({ user });
    const isSecure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    response.cookies.set(getSessionCookieName(), session.token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
