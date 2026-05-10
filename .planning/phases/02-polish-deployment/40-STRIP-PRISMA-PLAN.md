# Strip Prisma — Complete Migration Plan

**Goal**: Remove Prisma entirely from the Cloudflare Worker bundle to stay under 3MB limit.
**Strategy**: Replace Prisma ORM with Drizzle ORM (already installed as `drizzle-orm@0.41.0`) for all app queries + Better Auth.

---

## 1. Prisma Usage Inventory (File-by-File)

| # | File | Prisma Imports | Prisma API Used |
|---|------|---------------|-----------------|
| 1 | `src/lib/get-db.ts` | `PrismaClient`, `PrismaD1`, `PrismaLibSql`, `D1Database` | `getDb()` factory |
| 2 | `src/lib/db-cloudflare.ts` | `PrismaClient`, `PrismaD1`, `D1Database` | `createPrismaClientD1()` |
| 3 | `src/lib/auth.ts` | `PrismaClient`, `PrismaD1`, `PrismaLibSql`, `prismaAdapter` | Better Auth setup |
| 4 | `src/lib/auth-helpers.ts` | (none directly, but imports from `auth.ts`) | `auth.api.getSession()` |
| 5 | `src/app/api/auth/[...all]/route.ts` | (none directly, but imports `createAuth`) | Auth handler |
| 6 | `src/app/api/debt/route.ts` | `Prisma`, `getDb` | `findMany+include`, `create`, `PrismaClientKnownRequestError` |
| 7 | `src/app/api/debt/[id]/route.ts` | `Prisma`, `getDb` | `update`, `delete`, `PrismaClientKnownRequestError` |
| 8 | `src/app/api/debt/[id]/pay/route.ts` | `Prisma`, `getDb` | `$transaction([create, update])`, `findUnique`, `PrismaClientKnownRequestError` |
| 9 | `src/app/api/grab/route.ts` | `Prisma`, `getDb` | `findMany`, `create`, `PrismaClientKnownRequestError` |
| 10 | `src/app/api/payments/route.ts` | `Prisma`, `getDb` | `findMany+include`, `create`, `update`, `findUnique`, `PrismaClientKnownRequestError` |
| 11 | `src/app/api/dashboard/route.ts` | `Prisma`, `getDb` | `findFirst`, `findMany`, `findMany+include`, `PrismaClientKnownRequestError` |
| 12 | `src/app/api/subscriptions/route.ts` | `Prisma`, `getDb` | `findMany`, `create`, `PrismaClientKnownRequestError` |
| 13 | `src/app/api/subscriptions/[id]/route.ts` | `Prisma`, `getDb` | `update`, `PrismaClientKnownRequestError` |
| 14 | `src/app/api/export/route.ts` | `getDb` | `findMany+select` (no Prisma error handler) |

**Total**: 11 route files + 3 lib files = 14 files requiring changes.

---

## 2. Dependencies Already Available

| Package | Status | Purpose |
|---------|--------|---------|
| `drizzle-orm@0.41.0` | ✅ Installed | ORM for app queries + D1/libSQL drivers |
| `@libsql/client@0.17.3` | ✅ Installed | Local dev SQLite driver |
| `@better-auth/drizzle-adapter` | ⚠️ In pnpm store, NOT in package.json | Better Auth Drizzle adapter |
| `drizzle-orm/d1` | ✅ Available | D1 database driver |
| `drizzle-orm/libsql` | ✅ Available | libSQL database driver |

**Need to add to package.json**:
- `@better-auth/drizzle-adapter: "^1.6.9"` or latest

---

## 3. D1 Raw API Reference (for context)

The D1 JavaScript API:
```typescript
// D1Database methods
const db: D1Database = env.dana_db;

// Query rows
const { results } = await db.prepare("SELECT * FROM Debt WHERE status = ?").bind("active").all();
// results: Array<Record<string, unknown>>

// Single row
const row = await db.prepare("SELECT * FROM Debt WHERE id = ?").bind(id).first();

// Execute (INSERT/UPDATE/DELETE)
const info = await db.prepare("INSERT INTO Debt (...) VALUES (...)").bind(...).run();

// Batch
const batch = await db.batch([
  db.prepare("UPDATE Debt SET balance = ? WHERE id = ?").bind(newBalance, id),
  db.prepare("INSERT INTO PaymentCalendar (...) VALUES (...)").bind(...),
]);
```

**We will NOT use raw D1 queries directly.** Instead, we use Drizzle ORM which wraps D1 and provides:
- Type-safe query builders
- Schema-based table definitions
- Transactions, batch support
- Automatic type inference

---

## 4. Migration Strategy

### Phase A — Add Drizzle Schema & Config

#### A1. Create Drizzle config (`drizzle.config.ts`)
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL || "file:./prisma/dev.db",
  },
});
```

#### A2. Create Drizzle schema (`src/db/schema.ts`)
Define all 8 tables matching Prisma schema with proper types, relations, and indexes.

**8 Tables:**
- `users` — User auth data (id, email, emailVerified, name, image, password, timestamps)
- `accounts` — OAuth accounts (id, type, accountId, providerId, userId, tokens, timestamps)
- `sessions` — Auth sessions (id, token, userId, expiresAt, ipAddress, userAgent, timestamps)
- `verifications` — Email verifications (id, identifier, value, expiresAt, timestamps)
- `debts` — Debt tracking (id, type, balance, monthlyPayment, interestRate, startDate, endDate, status, notes, timestamps)
- `payment_calendar` — Payment schedule (id, debtId, dueDate, amount, status, paidDate, notes, timestamps)
- `grab_entries` — Ride income (id, date, platform, hours, gross, commission, fuel, tolls, net, notes, timestamps)
- `monthly_dashboards` — Monthly snapshots (id, month, salary, grabIncome, freelanceIncome, totalCommitments, food, fuelTolls, grabCosts, surplus, notes, timestamps)
- `subscriptions` — Recurring costs (id, name, cost, renewalDate, category, rating, active, notes, timestamps)

**Relations:** Debt → PaymentCalendar, MonthlyDashboard → Debt
**Indexes:** debt(status), payment_calendar(status, dueDate), grab_entries(date), monthly_dashboards(month)

#### A3. Keep Prisma for local schema management
- Prisma is still useful locally for schema changes and migrations
- Drizzle schema stays in sync with Prisma schema
- On deploy: use `wrangler d1 migrations apply`
- **Later**: can fully switch to Drizzle migrations once stable

### Phase B — Replace Core DB Helpers

#### B1. New `src/lib/get-db.ts` (Drizzle version)
```typescript
import { drizzle } from "drizzle-orm/libsql";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { createClient } from "@libsql/client";
import type { D1Database } from "@cloudflare/workers-types";
import * as schema from "@/db/schema";

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

let db: DrizzleDB | undefined;

export function getDb(d1Db?: D1Database) {
  if (d1Db) {
    // Cloudflare Workers
    return drizzleD1(d1Db, { schema }) as unknown as DrizzleDB;
  }
  // Local dev
  if (!db) {
    const client = createClient({
      url: process.env.DATABASE_URL?.replace("file:", "file://") || "file://./prisma/dev.db",
    });
    db = drizzle(client, { schema });
  }
  return db;
}

export type Db = typeof db;
```

#### B2. Remove/Replace `src/lib/db-cloudflare.ts`
Delete this file (no longer needed — logic is folded into `get-db.ts`).

#### B3. New `src/lib/auth.ts` (Drizzle adapter)
```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import type { D1Database } from "@cloudflare/workers-types";
import * as schema from "@/db/schema";

export function createAuth(d1Db?: D1Database) {
  const db = d1Db
    ? drizzleD1(d1Db, { schema })
    : drizzleLibsql(createClient({
        url: process.env.DATABASE_URL?.replace("file:", "file://") || "file://./prisma/dev.db",
      }), { schema });

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
    },
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    advanced: {
      cookiePrefix: "dana",
      csrf: {
        enabled: true,
        origin: process.env.BETTER_AUTH_URL || "http://localhost:3000",
      },
      rateLimit: {
        enabled: true,
        window: 60,
        max: 10,
      },
    },
  });
}

export const auth = createAuth();
export type Session = typeof auth.$Infer.Session;
```

#### B4. `src/lib/auth-helpers.ts`
This file imports `auth` from `auth.ts` — no changes needed as long as the interface stays the same.

### Phase C — Migrate Route Files

For each file, we replace:
- `@prisma/client` import → remove
- `getDb().model.findMany(...)` → `db.select().from(schema.model).where(...).orderBy(...)`
- `getDb().model.create({ data })` → `db.insert(schema.model).values(data).returning()`
- `getDb().model.update({ where, data })` → `db.update(schema.model).set(data).where(eq(model.id, id)).returning()`
- `getDb().model.delete({ where })` → `db.delete(schema.model).where(eq(model.id, id))`
- `getDb().model.findUnique({ where })` → `db.select().from(schema.model).where(eq(model.id, id)).get()`
- `getDb().$transaction([...])` → `db.transaction(async (tx) => { ... })`
- `Prisma.PrismaClientKnownRequestError` → remove or replace with `LibsqlError` / generic handling

#### C1. File: `src/app/api/debt/route.ts`

**GET:**
```typescript
// Prisma
const debts = await getDb().debt.findMany({
  orderBy: { balance: "desc" },
  include: {
    payments: { orderBy: { dueDate: "desc" }, take: 5 },
  },
});

// Drizzle
const debts = await db.select().from(debtsTable)
  .orderBy(desc(debtsTable.balance))
  .all();
// Payments need separate query or left join
// Option: use a subquery or LATERAL join
const debtIds = debts.map(d => d.id);
const payments = await db.select().from(paymentCalendar)
  .where(inArray(paymentCalendar.debtId, debtIds))
  .orderBy(desc(paymentCalendar.dueDate))
  .all();
// Then group by debtId, take first 5 per debt
```

**POST:**
```typescript
// Prisma
const debt = await getDb().debt.create({ data: { ... } });

// Drizzle
const [debt] = await db.insert(debtsTable).values({
  type: data.type,
  balance: data.balance,
  monthlyPayment: data.monthlyPayment,
  interestRate: data.interestRate ?? null,
  startDate: new Date(data.startDate || new Date()),
  endDate: data.endDate ? new Date(data.endDate) : null,
  status: data.status,
  notes: data.notes ?? null,
}).returning();
```

#### C2. File: `src/app/api/debt/[id]/route.ts`

**PATCH:**
```typescript
// Drizzle
const [debt] = await db.update(debtsTable)
  .set({
    ...(data.type !== undefined && { type: data.type }),
    ...(data.balance !== undefined && { balance: data.balance }),
    ...(data.monthlyPayment !== undefined && { monthlyPayment: data.monthlyPayment }),
    ...(data.status !== undefined && { status: data.status }),
    ...(data.notes !== undefined && { notes: data.notes }),
    ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
  })
  .where(eq(debtsTable.id, id))
  .returning();
```

**DELETE:**
```typescript
await db.delete(debtsTable).where(eq(debtsTable.id, id));
```

#### C3. File: `src/app/api/debt/[id]/pay/route.ts`

Most complex — uses `$transaction`. Replace with Drizzle `transaction`:

```typescript
const result = await db.transaction(async (tx) => {
  const payment = await tx.insert(paymentCalendar).values({
    debtId: id,
    dueDate: new Date(body.date ?? new Date()),
    amount: Math.min(amount, debt.balance),
    status: "paid",
    paidDate: new Date(),
    notes: body.notes ?? null,
  }).returning();

  const [updatedDebt] = await tx.update(debtsTable)
    .set({
      balance: Math.max(0, debt.balance - amount),
      status: debt.balance - amount <= 0 ? "paid" : "active",
    })
    .where(eq(debtsTable.id, id))
    .returning();

  return { payment: payment[0], debt: updatedDebt };
});
```

#### C4. File: `src/app/api/grab/route.ts`

**GET:**
```typescript
const entries = await db.select().from(grabEntry)
  .orderBy(desc(grabEntry.date))
  .limit(50)
  .all();
```

**POST:**
```typescript
const [entry] = await db.insert(grabEntry).values({ ... }).returning();
```

#### C5. File: `src/app/api/payments/route.ts`

**GET:** Same pattern — `db.select()` with join for debt type.

**POST:** `db.insert(..).values(..).returning()`

**PATCH:** `db.update(..).set(..).where(eq(..)).returning()`

#### C6. File: `src/app/api/dashboard/route.ts`

Most complex because of multiple aggregations. Key replacements:

```typescript
// findFirst → db.select().where(...).get()
const dashboardEntry = await db.select()
  .from(monthlyDashboard)
  .where(and(
    gte(monthlyDashboard.month, monthStart),
    lt(monthlyDashboard.month, nextMonthStart),
  ))
  .get();

// findMany with include → separate query or join
const monthPayments = await db.select({
  id: paymentCalendar.id,
  amount: paymentCalendar.amount,
  dueDate: paymentCalendar.dueDate,
  status: paymentCalendar.status,
  debtType: debtsTable.type,
}).from(paymentCalendar)
  .leftJoin(debtsTable, eq(paymentCalendar.debtId, debtsTable.id))
  .where(and(
    gte(paymentCalendar.dueDate, monthStart),
    lte(paymentCalendar.dueDate, monthEnd),
  ))
  .orderBy(asc(paymentCalendar.dueDate))
  .all();
```

For the active debts with this month's payments:
```typescript
const activeDebts = await db.select().from(debtsTable)
  .where(eq(debtsTable.status, "active"))
  .all();

// Then query payments separately:
for (const d of activeDebts) {
  const payments = await db.select().from(paymentCalendar)
    .where(and(
      eq(paymentCalendar.debtId, d.id),
      gte(paymentCalendar.dueDate, monthStart),
      lte(paymentCalendar.dueDate, monthEnd),
    ))
    .all();
  // aggregate...
}
```

#### C7. File: `src/app/api/subscriptions/route.ts`

Straightforward: `db.select()`, `db.insert()`.

#### C8. File: `src/app/api/subscriptions/[id]/route.ts`

Straightforward: `db.update()`.

#### C9. File: `src/app/api/export/route.ts`

**Straightforward** — replace `findMany+select` with `db.select({...}).from(...)`. No Prisma error handling to replace.

### Phase D — Type Safety Strategy

**Option A (Recommended): Hand-write types based on Prisma schema**

```typescript
// src/db/types.ts
export type Debt = {
  id: string;
  type: string;
  balance: number;
  monthlyPayment: number;
  interestRate: number | null;
  startDate: Date;
  endDate: Date | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};
```

Drizzle's `typeof` can infer types from schema definitions:
```typescript
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { debtsTable } from "./schema";

type Debt = InferSelectModel<typeof debtsTable>;
type NewDebt = InferInsertModel<typeof debtsTable>;
```

**Option B**: Use `drizzle-kit` to introspect existing DB and generate types (`pnpm drizzle-kit introspect:sqlite`)

**Option C**: Keep `@prisma/client` as a dev dependency for type generation only (Prisma CLI runs `generate` at build time, but the generated types don't bundle Prisma runtime).

**Recommendation**: Use Option A — Drizzle's `InferSelectModel`/`InferInsertModel` is the cleanest approach and requires no extra dependencies.

### Phase E — Better Auth D1 Adapter

**Current**: `better-auth/adapters/prisma` with PrismaClient → needs Prisma runtime.
**Future**: `@better-auth/drizzle-adapter` (official adapter from Better Auth team).

This adapter:
- Accepts a Drizzle DB instance
- Works with `provider: "sqlite"`
- Supports D1 via `drizzle-orm/d1`
- Supports the `schema` option for custom table names
- Does NOT need Prisma at all

**Compatibility Note**: The `@better-auth/drizzle-adapter` needs the correct version matching `better-auth`. Since the project has `better-auth@^1.2.0`, we need to install `@better-auth/drizzle-adapter@^1.6.9` (same major version series).

**Install**: `pnpm add @better-auth/drizzle-adapter`

### Phase F — Error Handling

Remove all `Prisma.PrismaClientKnownRequestError` references.

Replace with:
1. A generic `DatabaseError` handler
2. Or just return `{ error: "Database error" }` with status 500
3. Or use Drizzle-specific error types if needed (though Drizzle doesn't have its own error classes)

**Pattern for route files:**
```typescript
try {
  // ... Drizzle queries
} catch (error) {
  console.error("Database error:", error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Unknown error" },
    { status: 500 }
  );
}
```

No need for special Prisma error handling since D1/SQLite errors are straightforward.

### Phase G — Final Cleanup

**Remove from package.json:**
```diff
- "@prisma/adapter-d1": "^6.19.3",
- "@prisma/adapter-libsql": "^7.8.0",
- "@prisma/client": "^6.19.3",
- "prisma": "^6.19.3",
```

**Add to package.json:**
```diff
+ "@better-auth/drizzle-adapter": "^1.6.9",
```

**Remove files:**
- `src/lib/db-cloudflare.ts` (functionality merged into get-db.ts)

**Update imports in all route files:**
- Remove `import { Prisma } from "@prisma/client";`
- Add `import { eq, desc, asc, inArray, and, gte, lte, lt, or } from "drizzle-orm";`
- Import schema tables: `import { debtsTable, paymentCalendar, ... } from "@/db/schema";`

---

## 5. Estimated Effort per File

| File | Complexity | Est. Time | Key Challenge |
|------|-----------|-----------|---------------|
| `src/db/schema.ts` (new) | Medium | 30 min | Getting relations right |
| `src/db/types.ts` (optional) | Low | 10 min | Use InferSelectModel instead |
| `src/lib/get-db.ts` | Medium | 15 min | Type casting between D1/libSQL |
| `src/lib/db-cloudflare.ts` | Low (delete) | 2 min | Just remove |
| `src/lib/auth.ts` | Medium | 20 min | Drizzle adapter compatibility |
| `src/app/api/debt/route.ts` | Medium | 15 min | Payment include (needs 2 queries) |
| `src/app/api/debt/[id]/route.ts` | Low | 10 min | Simple update/delete |
| `src/app/api/debt/[id]/pay/route.ts` | High | 20 min | Transaction |
| `src/app/api/grab/route.ts` | Low | 10 min | Simple CRUD |
| `src/app/api/payments/route.ts` | Medium | 15 min | Join for debt type |
| `src/app/api/dashboard/route.ts` | High | 30 min | Multiple queries, aggregations |
| `src/app/api/subscriptions/route.ts` | Low | 8 min | Simple CRUD |
| `src/app/api/subscriptions/[id]/route.ts` | Low | 5 min | Simple update |
| `src/app/api/export/route.ts` | Low | 10 min | Simple select with projection |
| `drizzle.config.ts` (new) | Low | 5 min | Config file |
| **Total** | | **~3-4 hours** | |

---

## 6. Migration Workflow

```
┌─────────────────────────────────────────────────┐
│ 1. Create drizzle.config.ts                     │
├─────────────────────────────────────────────────┤
│ 2. Create src/db/schema.ts (all 8 tables)        │
├─────────────────────────────────────────────────┤
│ 3. Install @better-auth/drizzle-adapter          │
├─────────────────────────────────────────────────┤
│ 4. Replace src/lib/get-db.ts (Drizzle version)   │
├─────────────────────────────────────────────────┤
│ 5. Replace src/lib/auth.ts (Drizzle adapter)     │
├─────────────────────────────────────────────────┤
│ 6. Delete src/lib/db-cloudflare.ts               │
├─────────────────────────────────────────────────┤
│ 7. Migrate each route file (11 files)            │
│    ┌───────────────────────────────────────┐     │
│    │ Order: subs → grab → debt → payments  │     │
│    │        → dashboard → export → auth    │     │
│    └───────────────────────────────────────┘     │
├─────────────────────────────────────────────────┤
│ 8. Remove Prisma deps from package.json          │
├─────────────────────────────────────────────────┤
│ 9. Run `pnpm install` (clean unused deps)        │
├─────────────────────────────────────────────────┤
│ 10. Test local dev (pnpm dev)                    │
├─────────────────────────────────────────────────┤
│ 11. Deploy to Cloudflare (pnpm run deploy)       │
├─────────────────────────────────────────────────┤
│ 12. Verify bundle size (wrangler deploy --dry-run)│
└─────────────────────────────────────────────────┘
```

---

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Drizzle adapter incompatible with Better Auth version | High | Check version compatibility before migration; test with a minimal auth flow first |
| Drizzle query builder returns different shapes than Prisma | Medium | Test each endpoint after migration; use `console.log` to compare outputs |
| Transaction semantics differ between Prisma $transaction and Drizzle transaction | Medium | D1 supports transactions; test the payment flow specifically |
| Schema table/column naming conventions differ | Low | Drizzle's `usePlural` option; check Better Auth expects specific table names |
| Bundle size still over 3MB | Low | Likely fine — Drizzle is tree-shakeable and Prisma WASM was the bulk; verify with `wrangler deploy --dry-run --outdir=dist && ls -la dist/` |
| Better Auth schema table names conflict with app schema table names | Medium | Better Auth expects specific table names: `user`, `session`, `account`, `verification`. The app uses singular too (`Debt`, `GrabEntry`, etc.). Drizzle should use the same table names. Check the `schema` option in `drizzleAdapter` to map if needed |
| Route handler error response shape changes | Low | All routes use the same `{ error: "..." }` shape; just remove Prisma-specific error types |

---

## 8. Appendix: Key Drizzle Query Patterns

### Insert and return
```typescript
const [created] = await db.insert(schema.debts).values({
  type: "SPayLater",
  balance: 5000,
  // ...
}).returning();
```

### Update and return
```typescript
const [updated] = await db.update(schema.debts)
  .set({ balance: 4000 })
  .where(eq(schema.debts.id, id))
  .returning();
```

### Delete
```typescript
await db.delete(schema.debts)
  .where(eq(schema.debts.id, id));
```

### Select with join
```typescript
const results = await db.select({
  id: schema.payments.id,
  amount: schema.payments.amount,
  debtType: schema.debts.type,
})
.from(schema.payments)
.leftJoin(schema.debts, eq(schema.payments.debtId, schema.debts.id))
.where(eq(schema.payments.status, "pending"))
.orderBy(asc(schema.payments.dueDate))
.all();
```

### Select with includes (N+1 pattern)
Since Drizzle doesn't have Prisma's `include`, use two queries:
```typescript
const debts = await db.select().from(schema.debts)
  .orderBy(desc(schema.debts.balance))
  .all();

const debtIds = debts.map(d => d.id);
const payments = await db.select().from(schema.payments)
  .where(inArray(schema.payments.debtId, debtIds))
  .orderBy(desc(schema.payments.dueDate))
  .all();

// Group payments by debtId
const paymentsByDebt = new Map<string, typeof payments>();
for (const p of payments) {
  if (!paymentsByDebt.has(p.debtId!)) {
    paymentsByDebt.set(p.debtId!, []);
  }
  paymentsByDebt.get(p.debtId!)!.push(p);
}

const debtsWithPayments = debts.map(d => ({
  ...d,
  payments: (paymentsByDebt.get(d.id) || []).slice(0, 5),
}));
```

### Transaction
```typescript
const result = await db.transaction(async (tx) => {
  const [payment] = await tx.insert(schema.payments).values({...}).returning();
  const [updated] = await tx.update(schema.debts).set({...}).where(eq(schema.debts.id, id)).returning();
  return { payment, updated };
});
```

### Aggregation (sum, count)
```typescript
import { sum, count, sql } from "drizzle-orm";

const [result] = await db.select({
  total: sum(schema.payments.amount),
  count: count(),
}).from(schema.payments)
.where(eq(schema.payments.status, "paid"));
```

### Date range filter
```typescript
import { gte, lte, lt } from "drizzle-orm";

const monthStart = new Date(2026, 4, 1); // May 1
const monthEnd = new Date(2026, 4, 31, 23, 59, 59, 999);

const results = await db.select().from(schema.payments)
  .where(and(
    gte(schema.payments.dueDate, monthStart),
    lte(schema.payments.dueDate, monthEnd),
  ));
```
