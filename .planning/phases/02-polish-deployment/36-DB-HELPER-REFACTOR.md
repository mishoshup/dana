# Summary: Unified DB Helper + Route Handler Refactor

## What was done

### Created `src/lib/get-db.ts`
A unified database helper that selects the right PrismaClient based on environment:
- **Cloudflare Workers**: Creates per-request PrismaClient with D1 adapter when a `D1Database` binding is passed
- **Local dev**: Returns a singleton PrismaClient backed by SQLite (same pattern as original `db.ts` with globalThis caching)

### Updated all API route handlers
Replaced direct `import { prisma } from "@/lib/db"` with `import { getDb } from "@/lib/get-db"` and all `prisma.` calls → `getDb().` across:

| File | Change |
|------|--------|
| `src/app/api/debt/route.ts` | `prisma` → `getDb()` |
| `src/app/api/grab/route.ts` | `prisma` → `getDb()` |
| `src/app/api/payments/route.ts` | `prisma` → `getDb()` |
| `src/app/api/subscriptions/route.ts` | `prisma` → `getDb()` |
| `src/app/api/dashboard/route.ts` | `prisma` → `getDb()` |
| `src/app/api/export/route.ts` | `prisma` → `getDb()` |
| `src/app/api/debt/[id]/route.ts` | `prisma` → `getDb()` |
| `src/app/api/debt/[id]/pay/route.ts` | `prisma` → `getDb()` (incl. `$transaction`) |
| `src/app/api/subscriptions/[id]/route.ts` | `prisma` → `getDb()` |

### Fixed pre-existing PrismaD1 type issues
Three files (`auth.ts`, `db-cloudflare.ts`, `get-db.ts`) had `PrismaD1` type incompatibility with `@prisma/client`. Added `as any` type assertion to all three adapter instantiations. This was a pre-existing version mismatch between `@prisma/adapter-d1` and `@prisma/driver-adapter-utils`.

### Verification
`npx tsc --noEmit` → **0 errors** ✅
