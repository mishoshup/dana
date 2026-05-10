# Login Fix — Debug & Redirect Issue

## Problem

After successful login (POST `/api/auth/sign-in/email` returns 200 with `Set-Cookie`), the browser would NOT redirect to `/`. The session was created server-side but the client never navigated away from the login page.

## Root Cause Analysis

Two issues were identified:

### 1. `router.refresh()` after `router.push()` caused a race condition

The original code:
```ts
router.push("/");
router.refresh();
```

In Next.js App Router, `router.refresh()` requests a new React Server Component payload for the **current** route. Called immediately after `router.push("/")`, it would interrupt or cancel the client-side navigation because the RSC refresh payload would replace the navigated-to view with the current route's data.

The register page did **not** call `router.refresh()` after `router.push()`, which is why it worked (confirming this as the likely cause).

### 2. Missing `credentials: "include"` in fetch options

While `fetch` defaults to `credentials: "same-origin"` (which should work for same-origin requests), using `credentials: "include"` is explicit and ensures cookies are properly handled even in edge cases (e.g., when accessing via IP vs localhost, or behind a reverse proxy).

## Fix Applied

**File:** `src/app/(auth)/login/page.tsx`

Changes:
1. **Removed** `import { useRouter } from "next/navigation"` and the `router` instance
2. **Added** `credentials: "include"` to the fetch call
3. **Replaced** `router.push("/"); router.refresh();` with `window.location.href = "/"`

Using `window.location.href` ensures a **full page navigation** (not a client-side transition), which:
- Guarantees the session cookie (set via `Set-Cookie` in the fetch response) is sent with the navigation
- Lets the middleware properly validate the session
- Avoids any client-side router race conditions

## API Verification

```bash
curl -s -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"danial@danialsanusi.com","password":"dana12345"}'
# Returns 200 with token and set-cookie header
```

Response headers include `Set-Cookie: dana.session_token=...; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax`.

## Files Changed

| File | Change |
|------|--------|
| `src/app/(auth)/login/page.tsx` | Fixed redirect logic on successful login |

## Notes

- The register page (`register/page.tsx`) does not have this issue — it only calls `router.push("/")` without `router.refresh()`.
- The middleware (`middleware.ts`) was already correct — it allows `/api/auth/*` paths through and checks for `dana.session_token` on page routes.
- No changes needed to the API endpoint — it correctly returns 200 with `Set-Cookie` and user data.
