# Drizzle Auth Adapter — Migration Summary

**Task**: Replace Prisma adapter in `src/lib/auth.ts` with `@better-auth/drizzle-adapter`.

**Files created:**
- `src/db/schema.ts` — Drizzle schema with all 8 tables (auth + app)

**Files modified:**
- `src/lib/auth.ts` — Switched from `prismaAdapter` to `drizzleAdapter`

**Packages added:**
- `drizzle-orm@^0.41.0` (already in pnpm store as transitive dep, now explicit)
- `@better-auth/drizzle-adapter@^1.6.9`

## Schema Details

All 8 tables defined in `src/db/schema.ts`:

| Export name | DB table | Purpose |
|------------|----------|---------|
| `user` | `User` | Better Auth users |
| `session` | `Session` | Better Auth sessions |
| `account` | `Account` | Better Auth accounts |
| `verification` | `Verification` | Better Auth verification codes |
| `debts` | `Debt` | App — debt tracking |
| `paymentCalendar` | `PaymentCalendar` | App — payment schedule |
| `grabEntry` | `GrabEntry` | App — ride income |
| `monthlyDashboard` | `MonthlyDashboard` | App — monthly snapshots |
| `subscription` | `Subscription` | App — recurring costs |

**Column conventions:**
- IDs: `text("id").primaryKey()` (cuid strings)
- Dates: `integer("name", { mode: "timestamp_ms" })` — matches Prisma's ms epoch storage
- Booleans: `integer("name", { mode: "boolean" })` — matches SQLite 0/1 storage
- Numeric: `real("name")` for floats
- Foreign keys: `text("debtId")` — plain text (Drizzle doesn't enforce FK at the ORM level)

**Indexes:** Matches all Prisma `@@index` declarations:
- `debt_status_idx` on `Debt(status)`
- `payment_calendar_status_due_date_idx` on `PaymentCalendar(status, dueDate)`
- `grab_entry_date_idx` on `GrabEntry(date)`
- `monthly_dashboard_month_idx` on `MonthlyDashboard(month)`

## Auth Changes

`src/lib/auth.ts` now:
- Imports `drizzleAdapter` from `@better-auth/drizzle-adapter`
- Imports `drizzle` from `drizzle-orm/d1` (for Cloudflare Workers) and `drizzle-orm/libsql` (local dev)
- Creates a Drizzle DB instance using the same SQLite connection string
- Passes the full schema to both the Drizzle instance and the adapter config
- Removes all Prisma imports (`PrismaClient`, `PrismaD1`, `PrismaLibSql`, `prismaAdapter`)

## Verification

`npx tsc --noEmit` passes for both `src/lib/auth.ts` and `src/db/schema.ts`.
All 33 errors in output are from route files still using Prisma — these are expected and will be migrated in subsequent phases.

## Next Steps (for other phases)

1. Replace `src/lib/get-db.ts` with Drizzle version
2. Delete `src/lib/db-cloudflare.ts`
3. Migrate all 11 route files from Prisma to Drizzle queries
4. Remove Prisma deps from package.json
