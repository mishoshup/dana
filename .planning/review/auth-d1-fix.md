# Auth D1 Fix

## Problem
`src/app/api/auth/[...all]/route.ts` called `getCloudflareContext()` on every request. In local dev, OpenNext/Cloudflare provides a dev D1 emulator which *has no tables*, so registration would fail with `D1_ERROR: no such table: User`.

## Fix Applied (Option D)
Updated auth route handler at `src/app/api/auth/[...all]/route.ts` to check `process.env.NODE_ENV`:

- **Development** (`NODE_ENV !== "production"`): Uses local libSQL only. No D1 calls at all.
- **Production** (`NODE_ENV === "production"`): Tries D1 via `getCloudflareContext()`, falls back to local libSQL.

This avoids the dev D1 emulator entirely during local development while preserving production Cloudflare Workers behavior.

## Files Changed
- `src/app/api/auth/[...all]/route.ts` — environment-aware D1 resolution

## Verification
```bash
curl -s -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"name":"test","email":"test@test.com","password":"test12345"}'
```

Expected: 200 with user data (no D1 errors).
