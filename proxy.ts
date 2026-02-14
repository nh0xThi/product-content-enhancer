import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "pce_session";
const PUBLIC_ROUTES = new Set(["/login", "/register"]);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionCookie = req.cookies.get(SESSION_COOKIE)?.value;

  if (PUBLIC_ROUTES.has(pathname)) {
    if (sessionCookie) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  } else if (!sessionCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (req.method === "GET") {
    // Rewrite routes that match "/[...dndPath]/edit" to "/dnd/[...dndPath]"
    if (pathname.endsWith("/edit")) {
      const pathWithoutEdit = pathname.slice(0, pathname.length - 5);
      const pathWithEditPrefix = `/dnd${pathWithoutEdit}`;
      return NextResponse.rewrite(new URL(pathWithEditPrefix, req.url));
    }

    // Disable "/dnd/[...dndPath]"
    if (pathname.startsWith("/dnd")) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next({ request: req });
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api|.*\\..*).*)"],
};
