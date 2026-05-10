# Worker DB Path Fix

## Problem
All 9 route handlers imported `getLocalDb` from `@/db/local`, which dynamically imports `@libsql/client`. During Cloudflare Workers bundling, esbuild resolved this import and bundled Node.js-only APIs, causing the worker to crash.

## Solution
Created a unified database access pattern that avoids importing `@libsql/client` on Workers:

### New Files
- **`src/db/worker.ts`** — Pure D1 database access for Workers using `drizzle-orm/d1` + `getCloudflareContext()`
- **`src/db/unified.ts`** — Unified `getDb()` that tries Workers (D1) first, falls back to local dev (libSQL/`@libsql/client`)

### Changes
| File | Change |
|------|--------|
| `src/db/unified.ts` | New file — `getDb()` with try/catch pattern |
| `src/db/worker.ts` | New file — D1-only `getWorkerDb()` |
| 9 route handlers | Changed `import { getLocalDb }` → `import { getDb }`, `getLocalDb()` → `getDb()` |
| `src/lib/auth.ts` | Updated `getAuth()` to try D1 on Workers first |
| `src/app/api/auth/[...all]/route.ts` | Simplified to use `getAuth()` directly |

### Key Design
- On Workers: uses `getCloudflareContext()` → D1 binding → `drizzle-orm/d1`
- On local dev: dynamically imports `@libsql/client` inside function body
- The try/catch around `@opennextjs/cloudflare` import prevents any Workers code path from touching libSQL modules
- Singleton caching via module-level `_db` variable

### Verification
- `tsc --noEmit` — 0 errors
- `opennextjs-cloudflare build` — ✅
- `wrangler deploy` — ✅ Deployed to `https://dana.danialhaikalsanusi.workers.dev`
- Worker Version ID: `14d0a42e-f434-4fc7-b8bb-eea874dcd808`
