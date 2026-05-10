# 11 — Middleware Root Path (`/`) Auth Fix

**Status:** ✅ Fixed & Verified

## Problem

The middleware at `src/middleware.ts` had an unconditional pass-through for the root path `/`:

```ts
if (pathname === "/" || STATIC_FILE_RE.test(pathname)) {
    return NextResponse.next();
}
```

This allowed unauthenticated users to access the dashboard at `/` without any session cookie check.

## Fix

Removed the `pathname === "/"` condition so `/` now falls through to the session cookie check (same as all other page routes):

```ts
if (STATIC_FILE_RE.test(pathname)) {
    return NextResponse.next();
}
```

## Verification

```bash
$ curl -s -o /dev/null -w "HTTP: %{http_code} | Redirect: %{redirect_url}\n" http://localhost:3000/
HTTP: 307 | Redirect: http://localhost:3000/login?redirect=%2F
```

Unauthenticated requests to `/` now properly redirect to `/login` with the original path preserved in the `redirect` query param.

## Middleware flow after fix

1. PUBLIC_PATHS (auth routes) → allow
2. Static files (`.svg`, `.png`, etc.) → allow
3. API routes → allow (handlers do their own auth)
4. **All other page routes** (including `/`) → check session cookie, redirect to `/login` if missing
