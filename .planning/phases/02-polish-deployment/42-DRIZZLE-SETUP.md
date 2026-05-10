# Drizzle ORM Setup — Complete

**Date:** 2026-05-10  
**Status:** ✅ Complete  
**Next:** Migrate route handlers + auth.ts to Drizzle queries

---

## What Was Done

### 1. Installed Packages ✅

| Package | Version | Purpose |
|---------|---------|---------|
| `drizzle-orm` | 0.45.2 | ORM core |
| `@better-auth/drizzle-adapter` | 1.6.9 | Better Auth Drizzle adapter |

**Removed:**
- `@prisma/client`
- `@prisma/adapter-d1`
- `@prisma/adapter-libsql`
- `prisma`

### 2. Created `src/db/schema.ts` ✅

All 9 tables ported from Prisma schema to Drizzle `sqliteTable` definitions:

| Export | Table Name | Notes |
|--------|-----------|-------|
| `user` | `User` | Auth — email/password auth |
| `session` | `Session` | Auth — better-auth sessions |
| `account` | `Account` | Auth — OAuth accounts |
| `verification` | `Verification` | Auth — email verification |
| `debt` | `Debt` | Debt tracking (index on status) |
| `paymentCalendar` | `PaymentCalendar` | Payment schedule (index on status, dueDate) |
| `grabEntry` | `GrabEntry` | Ride income (index on date) |
| `monthlyDashboard` | `MonthlyDashboard` | Monthly snapshots (unique on month, index on month) |
| `subscription` | `Subscription` | Recurring costs |

**Key decisions:**
- `DateTime` → `text()` (SQLite stores as ISO 8601 string)
- `Boolean` → `integer({ mode: "boolean" })` 
- `Float` → `real()`
- Table names match Prisma exactly (`User`, `Debt`, etc.) for DB compat
- Export names are lowercase (matching Better Auth model convention)
- Indexes use new Drizzle v0.45 API: `(table) => [index("name").on(col)]`
- Foreign keys maintained where possible (`debtId → debt.id`, `userId → user.id`)

### 3. Created `src/db/index.ts` ✅

D1 database helper for Cloudflare Workers:
```typescript
import { drizzle } from "drizzle-orm/d1";
export function createDb(d1Db: D1Database) { ... }
```

### 4. Created `src/db/local.ts` ✅

Local development helper using libSQL:
```typescript
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
export const db = drizzle(client, { schema });
```
Points to `prisma/dev.db` for backward compat.

### 5. Removed Old Prisma Files ✅

- `src/lib/db.ts` — deleted
- `src/lib/get-db.ts` — deleted
- `src/lib/db-cloudflare.ts` — deleted

### 6. TypeScript Verification ✅

**Schema files (src/db/)**: **0 errors** ✅  
**All other files**: **31 errors** — all from route handlers and `auth.ts` still referencing old Prisma imports. Expected — next Fixer handles these.

### Error Breakdown (31 total)

| File | Errors | Cause |
|------|--------|-------|
| `src/app/api/dashboard/route.ts` | 13 | `@prisma/client` + `get-db` imports |
| `src/app/api/debt/route.ts` | 2 | Same |
| `src/app/api/debt/[id]/route.ts` | 2 | Same |
| `src/app/api/debt/[id]/pay/route.ts` | 3 | Same |
| `src/app/api/grab/route.ts` | 2 | Same |
| `src/app/api/payments/route.ts` | 2 | Same |
| `src/app/api/subscriptions/route.ts` | 2 | Same |
| `src/app/api/subscriptions/[id]/route.ts` | 2 | Same |
| `src/app/api/export/route.ts` | 4 | Same + implicit `any` params |
| `src/lib/auth.ts` | TBD | Old Prisma adapter — needs Drizzle adapter |
| `prisma/schema.prisma` | (kept as reference) | Still present, not removed |

---

## Next Steps (For Route Handler + Auth Fixer)

1. **Update `src/lib/auth.ts`** — Replace `prismaAdapter` with `drizzleAdapter`, import from `@/db/schema`
2. **Update all 9 route files** — Replace Prisma queries with Drizzle equivalents
3. **Optionally remove `prisma/` directory** entirely once fully migrated
