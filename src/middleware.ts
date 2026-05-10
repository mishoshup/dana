import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/api/auth",
  "/_next",
  "/login",
  "/register",
  "/favicon.ico",
];

const STATIC_FILE_RE = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|json|xml|txt)$/;

/**
 * Next.js middleware that protects page routes by checking for a session cookie.
 *
 * DESIGN NOTE: We do NOT import @/lib/auth here because Edge Runtime cannot
 * resolve PrismaClient (better-sqlite3 native addon). Instead:
 *   - Page routes: redirect to /login if no session cookie present
 *   - API routes: pass through (route handlers use requireAuthTuple()
 *     from auth-helpers.ts which runs in Node.js runtime and does proper
 *     session validation via Prisma)
 *   - Auth routes / static files: always allowed
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes through unconditionally
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files through
  if (STATIC_FILE_RE.test(pathname)) {
    return NextResponse.next();
  }

  // API routes → pass through (handlers do their own auth via requireAuthTuple)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Page routes → check for session cookie
  const sessionCookie = request.cookies.get("dana.session_token");
  if (!sessionCookie?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
