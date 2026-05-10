# Worker Size Solution — Prisma on Cloudflare Free Plan

**Date:** 2026-05-10  
**Author:** Oracle Agent  
**Status:** Complete  

---

## Executive Summary

The Dana project (Next.js 16 + Prisma 6.6 + OpenNext Cloudflare) cannot deploy on the **Cloudflare Workers Free Plan** because the Worker bundle exceeds the **3 MB size limit**. The primary culprit is Prisma's Rust query engine WebAssembly files (~5.6 MB total):

| WASM File | Size |
|-----------|------|
| `query_engine_bg.sqlite.wasm` | 2.0 MB |
| `query_compiler_bg.sqlite.wasm` | 1.6 MB |
| `query_engine_bg.wasm` | 2.0 MB |
| **Total WASM** | **~5.6 MB** |
| Rest of bundle | ~2 MB |

**The recommended solution is simple:** Upgrade Prisma to v6.16+ and enable `engineType = "client"` in the generator block. This eliminates all WASM query engine files entirely — Prisma Client becomes pure TypeScript, dropping the bundle by ~5.6 MB with no code changes to application logic.

---

## 1. ✅ Prisma "No Rust Engine" (`engineType = "client"`) — BEST APPROACH

### What it is

Prisma v6.16.0+ introduced the ability to run **without the Rust query engine**. Instead of shipping a 2 MB WASM binary that interprets Prisma queries, the generated client speaks directly to the database through a driver adapter (`@prisma/adapter-d1` for Cloudflare D1).

**Docs:** https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/no-rust-engine

### How to implement

**Step 1:** Upgrade Prisma packages (within 6.x series):

```bash
npm install prisma@^6.16.0 @prisma/client@^6.16.0 @prisma/adapter-d1@^6.16.0
```

> **Note:** Latest Prisma is 7.x (7.8.0 as of writing). The `engineType = "client"` feature works in both 6.x (≥6.16) and 7.x. Staying on 6.x is safer for a production migration. Upgrading to 7.x is a bigger jump with potential breaking changes.

**Step 2:** Update `prisma/schema.prisma` — add `engineType = "client"`:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
  engineType      = "client"
}
```

> **Note:** The Prisma docs recommend switching to `provider = "prisma-client"` (without `-js`) for the no-engine setup, but state `prisma-client-js` can be used "at your discretion." For minimal risk, keep `prisma-client-js` and test.

**Step 3:** Regenerate Prisma Client:

```bash
npx prisma generate
```

**Step 4:** Rebuild and deploy:

```bash
opennextjs-cloudflare build && opennextjs-cloudflare deploy
```

### Impact on bundle size

- Before: ~5.6 MB WASM + ~2 MB JS = **~7.6 MB** (exceeds 3 MB limit)
- After: ~0 WASM + ~2 MB JS = **~2 MB** (fits within 3 MB limit 💪)

### Risks

| Risk | Mitigation |
|------|------------|
| Prisma 6.16+ API differences from 6.6 | Run test suite; schema stays the same |
| `engineType = "client"` is GA since 6.16 but D1 adapter still "Preview" | Monitor Prisma GitHub for issues |
| Migration commands change (`prisma migrate` → `wrangler d1 migrations apply`) | Use `prisma migrate diff` for D1 workflow |
| `prisma-client-js` vs `prisma-client` generator | Test both; `prisma-client` is officially recommended for no-engine |

### Effort: LOW

- 5 minutes for package upgrades + generator update
- 0 code changes to route handlers, DB layer, or schema
- 30 minutes for testing and verification

---

## 2. ⏹️ Self-Hosted Prisma Accelerate — SECOND BEST

### What it is

Deploy a separate Cloudflare Worker running [`prisma-accelerate-local`](https://github.com/node-libraries/prisma-accelerate-local) that proxies Prisma queries. The main app connects to this proxy via HTTP (using Prisma's Accelerate protocol), eliminating the need to bundle Prisma's query engine in the main Worker.

**Reference:** https://zenn.dev/miravy/articles/c3787b3fc29546

### How it works

```
┌────────────────┐     HTTP (Accelerate protocol)    ┌──────────────────────┐
│  Main Worker   │ ────────────────────────────────→ │  Accelerate Proxy    │
│  (Dana App)    │                                   │  (separate Worker)   │
│  Small bundle  │                                   │  Has Prisma + WASM   │
└────────────────┘                                   └──────────────────────┘
                                                              │
                                                              ▼
                                                        ┌──────────┐
                                                        │  D1 DB   │
                                                        └──────────┘
```

### Pros
- No changes to Prisma usage in the main app
- Proven approach with open-source package
- Accelerate proxy Worker can be on its own free plan

### Cons
- **Complexity:** Need to create, deploy, and maintain a second Worker
- **Latency:** Each DB query goes through an extra HTTP hop (additional ~50-200ms)
- **Best for PostgreSQL:** The reference implementation is built for PostgreSQL + `@prisma/pg-worker`. SQLite/D1 support needs adaptation
- **WASM still exists:** The proxy Worker still bundles WASM, just shifted elsewhere
- **API key management:** Need to generate and securely share API keys between Workers

### Effort: MEDIUM-HIGH
- 1-2 days to set up and test the accelerator Worker
- Need to refactor DB initialization to use Accelerate URL instead of direct adapter
- Ongoing maintenance burden

---

## 3. 👨‍💻 Raw D1 API (Skip Prisma for Deployment) — VIABLE BUT HEAVY LIFT

### What it is

Replace Prisma Client with Cloudflare D1's native API (`env.dana_db.prepare().all()`) in all route handlers for production deployment. Keep Prisma for local dev only.

### What would change

Current pattern:
```typescript
// Current: Prisma
import { prisma } from "@/lib/db";
const debts = await prisma.debt.findMany({ orderBy: { balance: "desc" } });
```

Would become:
```typescript
// Raw D1 API
import { getD1 } from "@/lib/d1";
const db = await getD1(); // gets env.dana_db from cloudflare context
const { results: debts } = await db.prepare(
  "SELECT * FROM Debt ORDER BY balance DESC"
).all();
```

### How much work

The app uses Prisma in **12 files** across 6 API route groups:

| File | # Prisma calls |
|------|---------------|
| `src/app/api/debt/route.ts` | 4 (findMany, create, update, delete) |
| `src/app/api/debt/[id]/route.ts` | 3 |
| `src/app/api/debt/[id]/pay/route.ts` | 2 |
| `src/app/api/grab/route.ts` | 4 |
| `src/app/api/payments/route.ts` | 3 |
| `src/app/api/payments/[id]/route.ts` | 2 |
| `src/app/api/subscriptions/route.ts` | 4 |
| `src/app/api/subscriptions/[id]/route.ts` | 2 |
| `src/app/api/dashboard/route.ts` | 4 |
| `src/app/api/export/route.ts` | 2 |
| `src/lib/auth.ts` | Complex (better-auth integration) |
| `src/lib/auth-helpers.ts` | Auth session lookups |

### Critical blocker: Better Auth

`better-auth` uses `prismaAdapter()` which requires a Prisma client instance. Replacing auth to use raw D1 API is extremely risky — auth has complex session management, cookie handling, and security implications.

### Effort: VERY HIGH
- ~80-100 lines of raw SQL to write
- Loss of type safety (no more Prisma types on query results)
- Need to write and maintain D1 migration workflows instead of Prisma Migrate
- Better Auth integration is a showstopper — would need to hack the adapter
- High risk of bugs

---

## 4. ⚡ Drizzle ORM Migration — STRONG CONTENDER (for future)

### What it is

Replace Prisma ORM entirely with [Drizzle ORM](https://orm.drizzle.team/docs/connect-cloudflare-d1) — a lighter-weight, type-safe SQL ORM that has **first-class Cloudflare D1 support**.

### Why Drizzle works

Drizzle is fundamentally different from Prisma:
- **No query engine.** Drizzle generates raw SQL strings at build time — zero WASM, zero runtime engine.
- **Tiny bundle.** A Drizzle + D1 Worker fits easily within 3 MB.
- **D1-native.** `drizzle-orm/d1` adapter works directly with `env.dana_db`.
- **Build-time query building.** Queries are validated and SQL is generated at compile time, not runtime.

### Migration cost

| Area | Cost | Details |
|------|------|---------|
| Schema definition | Medium | Rewrite `schema.prisma` to Drizzle schema files |
| Migrations | Medium | Drizzle Kit replaces Prisma Migrate |
| Route handlers (12 files) | Medium | Rewrite Prisma calls to Drizzle queries |
| Auth (Better Auth) | **Critical** | `better-auth` has a separate Drizzle adapter (`better-auth/adapters/drizzle`) |
| Query patterns | Medium | Similar but different API (relational vs. table-based) |
| Learning curve | Low-Medium | Drizzle SQL-like API is intuitive |

### Key consideration: Better Auth

```typescript
// Current Prisma adapter
import { prismaAdapter } from "better-auth/adapters/prisma";
// Would become Drizzle adapter
import { drizzleAdapter } from "better-auth/adapters/drizzle";
```

Better Auth officially supports Drizzle, so this is feasible.

### Effort: MEDIUM
- 2-3 days for a careful migration
- Lower long-term maintenance burden
- Better Free Tier compatibility

### Not recommended as immediate fix
Drizzle migration is a full ORM replacement. It's the "do it right" approach but too disruptive for an urgent size fix. **Do this as a separate refactor if Prisma's limitations bother you long-term.**

---

## 5. ❌ Worker Splitting (Auth / Data Workers) — NOT RECOMMENDED

### What it is

Split the app into two Workers with service binding:
- **Auth Worker:** handles auth routes (small, no Prisma → fits free plan)
- **Data Worker:** handles data routes (with Prisma, WASM → needs paid plan)

### Why not to do this

1. **Still needs a paid Worker.** The Data Worker with Prisma + WASM still exceeds 3 MB. You'd need Workers Paid ($5+/mo) for at least one Worker.
2. **OpenNext limitation.** OpenNext outputs a single Worker. Manual splitting would fight the framework.
3. **Service binding complexity.** Cross-Worker communication adds latency and auth complexity.
4. **No real benefit** — you'd be on a paid plan for the data Worker anyway.

### Verdict: Only if upgrading to Workers Paid is acceptable

---

## 6. 🧰 Compression & Exclude Tricks

### Does Cloudflare count compressed or uncompressed size?

**Uncompressed.** The 3 MB free limit applies to the raw Worker script + WASM modules after all imports are resolved. Cloudflare does transparent gzip for transfer, but the limit check is on the decompressed size. Gzip doesn't help.

### Can wrangler.toml exclude files?

No. Wrangler bundles everything imported by your entry point. The only way to exclude WASM files is to not import the code that references them — which is exactly what `engineType = "client"` does.

### Can we mark WASM as external?

Only if you don't use the engine at all. The WASM files are required by Prisma's query runtime. You can't "exclude" them without breaking queries.

### What about the OpenNext `serverExternalPackages` config?

The current `next.config.ts` has:
```typescript
serverExternalPackages: ["@prisma/client", "@prisma/adapter-d1"],
```

This tells Next.js to externalize these packages during build. OpenNext's Cloudflare adapter then picks them up and bundles them into the Worker. **This is why the WASM files end up in the Worker bundle.** Removing this config would cause different errors (Prisma packages bundled incorrectly).

### Verdict: No tricks work. Engine must be eliminated.

---

## 7. 🔍 Recommended Approach: Tiered Plan

### Phase 1 — Immediate Fix (Today)

**Upgrade Prisma → enable `engineType = "client"`**

This is the fastest path to production deployment with zero application code changes.

| Step | Command/Change |
|------|---------------|
| 1. Upgrade Prisma packages | `npm install prisma@^6.16.0 @prisma/client@^6.16.0 @prisma/adapter-d1@^6.16.0` |
| 2. Add `engineType` to schema | Add `engineType = "client"` to `prisma/schema.prisma` generator block |
| 3. Regenerate client | `npx prisma generate` |
| 4. Fix DB initialization | Change all route handlers to use `createPrismaClientD1()` instead of global `prisma` from `@/lib/db` |
| 5. Build & deploy | `opennextjs-cloudflare build && opennextjs-cloudflare deploy` |

**Wait — there's a deeper issue.** Looking at the route handlers:

```typescript
// src/app/api/debt/route.ts
import { prisma } from "@/lib/db"; // ❌ Uses standard PrismaClient, not D1 adapter

export async function GET() {
  const debts = await prisma.debt.findMany({...}); // Won't work on Workers!
  // ...
}
```

The current code only uses `createPrismaClientD1()` in the auth route. All other routes use the standard `PrismaClient` from `@/lib/db` which reads DATABASE_URL from env. **On Cloudflare Workers, this will try to open a local SQLite file — it won't use D1 at all.**

**The DB initialization architecture needs rework.** There are two options:

#### Option A: Make `@/lib/db` Cloudflare-aware (Recommended)

```typescript
// src/lib/db.ts — refactored
import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

let prisma: PrismaClient;

async function getDb() {
  if (prisma) return prisma;
  
  try {
    // Cloudflare Workers path
    const { env } = await getCloudflareContext({ async: true });
    if (env.dana_db) {
      const adapter = new PrismaD1(env.dana_db);
      prisma = new PrismaClient({ adapter });
    } else {
      prisma = new PrismaClient();
    }
  } catch {
    // Local dev path
    prisma = new PrismaClient();
  }
  return prisma;
}

export { getDb };
```

Then update all route handlers:
```typescript
import { getDb } from "@/lib/db";
const prisma = await getDb();
// ... use prisma as before
```

#### Option B: Pass D1 binding to route handlers

More work but cleaner separation. Uses the existing pattern from the auth route.

### Phase 2 — Migration Workflow (This Week)

Switch from `prisma migrate` to `wrangler d1 migrations` for D1:

```bash
# Generate migration SQL from Prisma schema diff
npx prisma migrate diff --from-local-d1 --to-schema ./prisma/schema.prisma --script --output migrations/0003_next_change.sql

# Apply to local D1
npx wrangler d1 migrations apply dana-db --local

# Apply to remote D1
npx wrangler d1 migrations apply dana-db --remote
```

### Phase 3 — Optional Drizzle Migration (Future)

If Prisma continues to cause friction (limited D1 support, preview features, bundle concerns), migrate to Drizzle for a permanently leaner setup.

---

## 8. ⚠️ Risks & Tradeoffs Summary

| Risk | Severity | Solution |
|------|----------|----------|
| Prisma 6.16 API changes | Low | Pin to 6.x; test before deploy |
| D1 adapter still Preview | Medium | Monitor Prisma GitHub discussions |
| `engineType = "client"` perf diff | Low | Prisma claims parity; test with load |
| DB init needs rewrite | Medium | Refactor `lib/db.ts` to be Cloudflare-aware |
| Better Auth + D1 adapter | Medium | Already using `PrismaD1` in auth.ts — just needs route handler unification |
| D1 doesn't support transactions | Medium | D1 limitation — Prisma handles gracefully (batch writes) |
| Migration workflow change | Low | `prisma migrate diff` + `wrangler d1` replaces `prisma migrate dev` |

---

## 9. References

- [Prisma No Rust Engine Docs](https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/no-rust-engine)
- [Prisma Cloudflare D1 Deploy Docs](https://www.prisma.io/docs/orm/v6/overview/databases/cloudflare-d1)
- [Prisma Cloudflare Workers Deploy Docs](https://www.prisma.io/docs/orm/v6/prisma-client/deployment/edge/deploy-to-cloudflare)
- [Prisma Bundle Size Discussion #24806](https://github.com/prisma/prisma/discussions/24806)
- [Drizzle ORM + Cloudflare D1](https://orm.drizzle.team/docs/connect-cloudflare-d1)
- [Self-hosted Prisma Accelerate (Zenn)](https://zenn.dev/miravy/articles/c3787b3fc29546?locale=en)
- [prisma-accelerate-local GitHub](https://github.com/node-libraries/prisma-accelerate-local)
- [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare D1 Worker API](https://developers.cloudflare.com/d1/worker-api/)
