# Fix: D1 Adapter Edge Runtime Crash

## Root Cause

`middleware.ts` → `@/lib/auth` → `@/lib/db` — the import chain caused the Edge Runtime to resolve `@prisma/adapter-d1` at module load time, pulling in workerd dependencies that crash outside a Cloudflare Worker environment.

## Fix Applied (Option A)

Extracted D1-specific PrismaClient setup to a separate file that is **never imported** by the auth/middleware chain.

### Changes

1. **Created `src/lib/db-cloudflare.ts`** — Contains `createPrismaClientD1()` with the `PrismaD1` adapter import and `D1Database` type. Only to be imported in Cloudflare Worker / OpenNext contexts.

2. **Updated `src/lib/db.ts`** — Removed:
   - `import { PrismaD1 } from "@prisma/adapter-d1"` (top-level, caused the crash)
   - `createPrismaClientD1()` function
   - Added comment pointing to `db-cloudflare.ts` for deployment

3. **No changes needed for** `src/lib/auth.ts` or `src/middleware.ts` — they only import `prisma` (standard PrismaClient), which is unaffected.

### Verification

- `auth.ts` imports `prisma` from `@/lib/db` — this is the standard PrismaClient, no D1 dependency
- `middleware.ts` imports `auth` from `@/lib/auth` — no D1 dependency in the chain
- D1 adapter code lives in `db-cloudflare.ts` and is only imported explicitly in Cloudflare Worker contexts
