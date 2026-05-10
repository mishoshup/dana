# Drizzle Route Migration — Complete

**Fixed by**: Pantheon Fixer (drizzle-routes)  
**Date**: 2026-05-10  
**Status**: ✅ Complete — all 9 route files migrated

## Files Updated

| # | Route | Handlers | Key Changes |
|---|-------|----------|-------------|
| 1 | `debt/route.ts` | GET, POST | GET: 2-query pattern (debts + payments) instead of Prisma `include`; POST: `db.insert().returning()` with `crypto.randomUUID()` |
| 2 | `debt/[id]/route.ts` | PATCH, DELETE | `db.update().where(eq()).returning()` with 404 check; `db.delete().where(eq())` |
| 3 | `debt/[id]/pay/route.ts` | POST (transaction) | `db.transaction(async (tx) => {...})` replacing `$transaction([create, update])` |
| 4 | `grab/route.ts` | GET, POST | `.limit(50)` replacing `take: 50`; ISO string dates |
| 5 | `payments/route.ts` | GET, POST, PATCH | GET: `leftJoin` with debt table; `.limit(50)`; idempotent PATCH |
| 6 | `subscriptions/route.ts` | GET, POST | Simple CRUD; variable renamed to `newSubscription` to avoid shadowing |
| 7 | `subscriptions/[id]/route.ts` | PATCH | `db.update().returning()` with 404 check |
| 8 | `dashboard/route.ts` | GET | 5 separate queries combining in JS; `leftJoin` for payments+debt type; ISO string date comparisons |
| 9 | `export/route.ts` | GET (3 types) | `db.select({...})` with projection instead of `findMany+select`; string-based date formatting |

## Pattern Reference Applied

| Prisma | Drizzle |
|--------|---------|
| `getDb().debt.findMany({ where: { status } })` | `db.select().from(debtTable).where(eq(debtTable.status, val)).all()` |
| `getDb().debt.findUnique({ where: { id } })` | `db.select().from(debtTable).where(eq(debtTable.id, id)).limit(1).all()` then check `[0]` |
| `getDb().debt.create({ data: {...} })` | `db.insert(debtTable).values({ id: crypto.randomUUID(), ... }).returning()` |
| `getDb().debt.update({ where: { id }, data: {...} })` | `db.update(debtTable).set({...}).where(eq(debtTable.id, id)).returning()` |
| `getDb().debt.delete({ where: { id } })` | `db.delete(debtTable).where(eq(debtTable.id, id))` |
| `getDb().$transaction([...])` | `db.transaction(async (tx) => {...})` |
| `orderBy: { field: "desc" }` | `.orderBy(desc(table.field))` |
| `take: 50` | `.limit(50)` |
| `include: { debt: { select: { type } } }` | `.leftJoin(debtTable, eq(...))` with `db.select({...})` |
| `Prisma.PrismaClientKnownRequestError` | Generic `Error` handling with `console.error()` |
| `new Date()` for DB writes | `.toISOString()` (schema uses `text` columns) |
| Auto-generated IDs by Prisma | `crypto.randomUUID()` (Node.js built-in) |

## Important Handling for Dates

The Drizzle schema uses `text()` columns for all date fields (no date mode). This means:
- **Writing**: Convert `Date` objects to ISO strings: `new Date().toISOString()`
- **Reading**: Drizzle returns date strings directly; no `.toISOString()` call needed
- **Comparison**: ISO string comparison works for date ranges
- The `dashboard/route.ts` converts month boundaries to ISO strings for `gte`/`lte`/`lt` filters

## Import Convention Used

```typescript
import { db } from "@/db/local";
import { debt as debtTable, paymentCalendar as paymentCalendarTable, grabEntry as grabEntryTable, monthlyDashboard, subscription } from "@/db/schema";
import { eq, desc, asc, and, gte, lte, lt, inArray } from "drizzle-orm";
```

Tables used directly (no alias): `monthlyDashboard`, `subscription`  
Tables with alias (to avoid variable shadowing): `debtTable`, `paymentCalendarTable`, `grabEntryTable`

## TypeScript Check

`npx tsc --noEmit` → **Zero errors** ✅
