# Login & Register Pages — Redirect When Already Logged In

## Summary

Added client-side session-check redirect for both `/login` and `/register` pages using the **Approach A (cookie check)** strategy.

## Changes

### `src/app/(auth)/login/page.tsx`
- Added `useEffect` import
- Added `useRouter` import and instantiation
- Added `useEffect` that checks for `"dana.session_token"` in `document.cookie` and redirects to `/` if found

### `src/app/(auth)/register/page.tsx`
- Added `useEffect` to the React import
- Added `useEffect` that checks for `"dana.session_token"` in `document.cookie` and redirects to `/` if found
- (Already had `useRouter` from before)

## How It Works

On mount, both pages check whether `dana.session_token` exists in the browser cookies. If it does, the user is already authenticated and gets redirected to the dashboard via `router.push("/")`. The `useEffect` runs once on mount (dependency: `[router]`).

## Why Cookie Check?

- **No network request** — instant redirect, no flash of form
- **Reliable** — the session cookie is set by the auth API response via `Set-Cookie`
- **Simple** — one-liner check, no extra API endpoints to depend on
