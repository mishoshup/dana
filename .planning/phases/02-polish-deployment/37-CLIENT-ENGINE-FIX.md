# Engine Type Fix: `engineType = "client"` + Driver Adapters

## Summary

Successfully migrated from default Prisma engine to `engineType = "client"` with proper driver adapters for both Cloudflare Workers and local dev.

## Changes Made

### 1. `prisma/schema.prisma`
- Added `engineType = "client"` to the generator block
- Prisma will no longer generate/require WASM query engine files

### 2. `src/lib/get-db.ts` (dual adapter factory)
- **Cloudflare Workers (D1):** Uses `PrismaD1` adapter with `D1Database` binding
- **Local dev:** Uses `PrismaLibSql` adapter backed by SQLite via `@libsql/client`
- Properly initializes adapter config (not client instance) — `PrismaLibSql` takes a config object with `url`, not a pre-created client

### 3. `src/lib/db.ts` (local dev singleton)
- Replaced `new PrismaClient()` with `new PrismaClient({ adapter: new PrismaLibSql({...}) })`

### 4. `src/lib/auth.ts` (Better Auth integration)
- Updated both branches of `createAuth()`:
  - `d1Db` branch: uses PrismaD1 adapter
  - Local dev branch: uses PrismaLibSql adapter
- Removed `as any` casts from PrismaD1 usage

### 5. `src/lib/db-cloudflare.ts`
- Removed `as any` cast from `new PrismaD1(env.DB)`

### 6. New dependencies
- `@prisma/adapter-libsql@7.8.0`
- `@libsql/client@0.17.3`

## Build Results

| Check | Status |
|-------|--------|
| `pnpm install` | ✅ Passed |
| `npx prisma generate` | ✅ Passed (v6.19.3, no WASM generated) |
| `npx tsc --noEmit` | ✅ Passed (0 errors) |
| `npx opennextjs-cloudflare build` | ✅ Passed |
| WASM files referenced by handler.mjs | ❌ **Not referenced** (dead files in node_modules only) |
| `npx wrangler deploy` | ❌ **Failed** — Worker exceeds 3 MiB free plan limit |

## Deployment Issue

The Cloudflare Worker exceeds the free plan's 3 MiB size limit:
- `handler.mjs` is **7.3 MiB** (Next.js + app code + dependencies)
- This is a **pre-existing issue**, not caused by the engine type change

The WASM files from `@prisma/client/runtime/` (~30+ MB of base64-encoded engines for sqlite, mysql, postgresql, etc.) are **present in `node_modules` but NOT referenced by the handler**. They're inert.

**To deploy**, one of:
1. Upgrade to a paid Cloudflare Workers plan (supports up to 10 MiB)
2. Investigate reducing handler size (tree-shaking, dependency pruning)
3. Alternative: use `library` engine type with WASM files stored in R2 and loaded at runtime
