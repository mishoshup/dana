# Auth Middleware Summary

## What was done

Created `src/middleware.ts` to protect all API routes and pages with Better Auth session validation.

## Implementation

- **Pattern:** Standard Next.js middleware (Edge runtime compatible)
- **Auth check:** Uses `auth.api.getSession({ headers: request.headers })` to validate session from the request headers
- **Error handling:** Try/catch around session check with 503 fallback if auth service is unavailable

## Route protection matrix

| Route pattern      | Unauthenticated behavior                      |
|--------------------|-----------------------------------------------|
| `/api/auth/*`      | ✅ Allowed (Better Auth manages its own auth)  |
| `/login`           | ✅ Allowed (public auth page)                  |
| `/register`        | ✅ Allowed (public auth page)                  |
| `/_next/*`         | ✅ Allowed (Next.js internals)                 |
| Static files       | ✅ Allowed (images, CSS, JS, etc.)             |
| Other `/api/*`     | 🔒 401 JSON response                          |
| Other page routes  | 🔒 Redirect to `/login?redirect=<path>`       |

## Matcher config

Uses Next.js matcher to exclude `api/auth`, `_next/*`, and `favicon.ico` from the middleware entirely. All other exclusions (static files, login page, register page) are handled in the middleware body for clarity.

## Dependencies

- `@/lib/auth` — existing Better Auth instance
- `next/server` — NextRequest, NextResponse (both built-in)

## Notes

- The login page (`src/app/(auth)/login/page.tsx`) already handles the case where a user is already authenticated, so the redirect loop is safe.
- The `redirect` search param on the login URL allows the login page to redirect back after successful authentication (requires login page support).
- Existing API routes already use `requireAuthTuple()` from `auth-helpers.ts` — the middleware adds a second layer of protection at the edge.
