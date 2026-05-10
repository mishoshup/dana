# 🏛️ PANTHEON AUDIT — Dana Personal Finance OS

**Generated:** 2026-05-10  
**Sources:** EXPLORER-REPORT.md (22 issues), COUNCIL-REVIEW.md (21 issues)  
**Consolidated by:** LIBRARIAN

---

## 1. Executive Summary

The Dana codebase is structurally unstable for deployment. The primary dashboard and all feature pages (Grab, Subscriptions) are powered by hardcoded mock data instead of live API fetches, making them non-functional. Authentication is entirely absent — every API route and page is publicly accessible, which is a critical data leak. The Cloudflare Workers deployment target has a fundamental Prisma/D1 adapter mismatch that will cause runtime crashes in production. While the architecture (Next.js + Prisma + shadcn/ui) and database schema are well-designed, roughly half the issues are medium-to-high severity and must be resolved before the app can be safely deployed.

---

## 2. Issue Breakdown by Severity

| Severity   | Unique Issues | Key Areas |
|------------|--------------|-----------|
| 🔴 Critical | 5            | Auth, D1 adapter, hardcoded dash, Grab form |
| 🟠 High     | 4            | Broken features, env docs, config bugs |
| 🟡 Medium   | 8            | Schema, error handling, validation, UI bugs |
| 🟢 Low      | 10           | Polish, a11y, docs, cosmetics |
| **Total**   | **27**       | Merged from 2 reports (22 + 21 = 27 unique) |

> **Merge note:** 22 (Explorer) + 21 (Council) = 43 raw issues → 27 unique after deduplication. Cross-report duplicates (e.g., auth, D1 adapter, Grab form) were merged with the higher severity kept.

---

## 3. Critical Issues — Deep Dive

### C-01: 🔴 No authentication on any page or API route
**Sources:** Explorer #2, #11 | Council CRITICAL-01  
**Files:** All `src/app/api/*/route.ts`, all `src/app/*/page.tsx`  
**Severity:** CRITICAL

**Problem:** Better Auth is configured but never used. No `middleware.ts` checks session validity. None of the 5+ API routes call `auth.api.getSession()`. Every endpoint (debts, payments, grab entries) is fully open — anyone with the URL can read, create, modify, or delete financial data. App pages render regardless of auth state.

**Impact:** Complete data exposure. A personal finance app with zero access control is a catastrophic security gap.

**Fix:**
1. Create `src/middleware.ts` with route matchers for `/api/*` and `/app/*` (except auth routes).
2. Create a reusable `requireAuth()` helper:
   ```ts
   export async function requireAuth() {
     const session = await auth.api.getSession({ headers: await headers() });
     if (!session) throw new UnauthorizedError();
     return session;
   }
   ```
3. Apply to every API route handler, returning 401 on failure.

---

### C-02: 🔴 Dashboard is 100% hardcoded mock data
**Sources:** Explorer #1 | Council HIGH-01  
**Files:** `src/app/page.tsx` (lines ~8–27)  
**Severity:** CRITICAL

**Problem:** The dashboard (`/`) displays hardcoded `debts` and `upcoming` arrays. The monthly surplus calculation uses magic numbers (`450` for food, `300` for fuel, `100` for other). None of the summary cards fetch from `/api/debt` or `/api/payments`. This is the app's landing page and primary view.

**Impact:** Users see stale/fake financial data. Trust in the entire app is undermined from the first view.

**Fix:**
1. Fetch debts from `GET /api/debt` and upcoming payments from `GET /api/payments` on mount.
2. Compute surplus from actual income/expense data in the DB.
3. Remove all hardcoded arrays and magic numbers.
4. Consider a `GET /api/dashboard` endpoint for summary aggregates.

---

### C-03: 🔴 Cloudflare D1 adapter not wired — Prisma won't work on deployment
**Sources:** Explorer #3 | Council CRITICAL-03  
**Files:** `src/lib/db.ts`, `prisma/schema.prisma`, `open-next.config.ts`  
**Severity:** CRITICAL

**Problem:** `src/lib/db.ts` creates `new PrismaClient()` (standard Prisma), but the deployment target is Cloudflare Workers with D1. In Workers, there is no writable filesystem — standard PrismaClient will crash. D1 requires the `@prisma/adapter-d1` adapter: `new PrismaClient({ adapter: new PrismaD1(env.DB) })`. The current code has no platform-aware initialization.

**Impact:** Runtime crash on deployment. All database operations will throw errors.

**Fix:**
1. Use conditional initialization — detect Cloudflare environment via `getRequestContext()` or env var.
2. For Cloudflare Workers: use `PrismaD1` adapter with the D1 binding.
3. For local dev: use standard PrismaClient with local SQLite.
4. Verify better-auth's `provider: "sqlite"` config works with D1's Wire Protocol.

---

### C-04: 🔴 Grab page form has no submit handler
**Sources:** Explorer #5 | Council CRITICAL-02  
**Files:** `src/app/grab/page.tsx` (lines ~63–83)  
**Severity:** CRITICAL

**Problem:** The "Log Ride" form renders a `<form>` with `<button type="submit">` but zero submission logic — no `onSubmit`, no `action`, no state management. Inputs lack `name` attributes. Clicking "Save Entry" silently discards data. All displayed charts/stats are hardcoded mock data.

**Impact:** The entire Grab feature is non-functional. Users filling in ride data lose their input on page refresh.

**Fix:**
1. Add controlled state for form inputs.
2. Wire `onSubmit` handler to `POST /api/grab`.
3. Add loading/success/error states.
4. Fetch real data from `/api/grab` for the charts and stats.

---

### C-05: 🔴 No database migrations or seed script
**Sources:** Explorer #22  
**Files:** `prisma/` (missing `migrations/` folder)  
**Severity:** CRITICAL

**Problem:** The `prisma/` directory contains only `schema.prisma` and a local `dev.db` file. There is no `migrations/` directory, meaning the schema has never been formally migrated. There's no `seed.ts` script for bootstrapping development data.

**Impact:** Cannot deploy to production — D1 database schema has no migration history. No repeatable way to set up a fresh dev environment.

**Fix:**
1. Run `prisma migrate dev` to generate initial migration files.
2. Create `prisma/seed.ts` with development data.
3. Add `"prisma": { "seed": "tsx prisma/seed.ts" }` to `package.json`.

---

## 4. Technical Debt Log

### 🟠 HIGH

| # | Issue | Source | File | Fix |
|---|-------|--------|------|-----|
| H-01 | Subscriptions page hardcoded + Switch doesn't work | Explorer #7, Council HIGH-02 | `src/app/subscriptions/page.tsx` | Fetch from API; toggle calls PATCH; use controlled Switch |
| H-02 | next.config.ts orphan promise after export | Explorer #4, Council HIGH-04 | `next.config.ts` | Static import or conditional dynamic import |
| H-03 | No `.env.example` documenting required env vars | Explorer #20, Council HIGH-03 | (missing) | Create `.env.example` with DATABASE_URL, BETTER_AUTH_URL, BETTER_AUTH_SECRET |
| H-04 | Grab page entirely hardcoded mock data | Explorer #6 | `src/app/grab/page.tsx` | Fetch from `/api/grab`; remove hardcoded weekData/stats |

### 🟡 MEDIUM

| # | Issue | Source | File | Fix |
|---|-------|--------|------|-----|
| M-01 | `paidThisMonth` incorrectly counts unpaid bills | Explorer #8 | `src/app/debt/page.tsx` | Add `p.status === "paid"` filter |
| M-02 | `paySuccess` type mismatch in catch block | Explorer #9, Council MEDIUM-06 | `src/app/debt/page.tsx` | Use `catch (e: unknown)` + `instanceof Error` |
| M-03 | PaymentAmount stored as Float instead of cents | Explorer #10 | `prisma/schema.prisma` (multiple models) | Change to `Int` (cents); convert in UI |
| M-04 | Payments API PATCH has no `body.id` validation | Explorer #11 | `src/app/api/payments/route.ts` | Validate `body.id` before calling prisma.update |
| M-05 | Grab API route — no input validation | Explorer #14 | `src/app/api/grab/route.ts` | Add field-level validation (Zod or manual) |
| M-06 | Prisma schema: incomplete MonthlyDashboard ↔ Debt relation | Council MEDIUM-01 | `prisma/schema.prisma` | Add `monthlyDashboardId` to Debt model |
| M-07 | API error messages too generic (no env-aware detail) | Council MEDIUM-02 | Multiple API route files | Differentiate messages for dev vs production |
| M-08 | No loading/error states on Dashboard/Grab/Subscriptions | Council MEDIUM-03 | `page.tsx` (3 files) | Add Suspense boundaries + loading/error states |

### 🟢 LOW

| # | Issue | Source | File | Fix |
|---|-------|--------|------|-----|
| L-01 | Subscriptions page layout — `pt-16` vs `pt-20` mismatch | Explorer #7b | `src/app/subscriptions/page.tsx` | Use consistent padding from Shell |
| L-02 | Snowball projection logic is wrong for multiple debts | Explorer #21 | `src/app/debt/page.tsx` | Sequential simulation instead of per-debt extra |
| L-03 | Manifest references missing icon PNGs | Explorer #12 | `public/manifest.json` | Generate 192/512 PNG icons |
| L-04 | Login page links to `/register` which doesn't exist | Explorer #13 | `src/app/(auth)/login/page.tsx` | Create register page or remove link |
| L-05 | No global error boundary or not-found page | Explorer #15 | `src/app/` | Create `error.tsx` and `not-found.tsx` |
| L-06 | `pnpm-workspace.yaml` includes unnecessary builds | Explorer #17 | `pnpm-workspace.yaml` | Conditionally exclude better-sqlite3 for deploy |
| L-07 | Dashboard surplus color always green | Council LOW-01 | `src/app/page.tsx` | Conditional class for deficit (red) |
| L-08 | Snowball projection ignores interest rates | Council LOW-02 | `src/app/debt/page.tsx` | Annotate "(excl. interest)" or implement amortization |
| L-09 | Login form has no client-side error handling | Council LOW-03 | `src/app/(auth)/login/page.tsx` | Switch to client-side submission with inline errors |
| L-10 | No accessibility attributes anywhere | Council LOW-08 | All pages | Add aria-labels, roles, focus management |
| L-11 | `pt-20 md:pt-8` repeated on every page | Council LOW-05 | All page.tsx files | Move padding to layout/Shell |
| L-12 | Payments fetch uses `.catch()` instead of `async/await` | Council LOW-06 | `src/app/payments/page.tsx` | Refactor for consistency |

---

## 5. Recommendations — Top 5 by Priority

### 1. 🔴 Implement authentication middleware
**Effort:** Medium | **Risk reduction:** Critical

Create `src/middleware.ts` with route matchers for `/api/*` (except auth) and app routes. Add `requireAuth()` helper. This is the single highest-impact change — without it, all financial data is publicly accessible.

### 2. 🔴 Wire D1 adapter properly
**Effort:** Medium | **Risk reduction:** Critical

Refactor `src/lib/db.ts` to detect deployment environment and use the correct Prisma adapter. Without this, the app will crash on Cloudflare Workers deployment. This blocks deployment entirely.

### 3. 🔴 Connect dashboard to real data
**Effort:** Small | **Risk reduction:** High

Replace the hardcoded `debts` and `upcoming` arrays with API fetches. The dashboard is the landing page — fake data makes the entire app look broken. This is a quick win with high visibility impact.

### 4. 🔴 Fix Grab form or remove the feature
**Effort:** Small | **Risk reduction:** High

Wire up the form's `onSubmit` handler to `POST /api/grab` with proper state management. Alternatively, hide the non-functional feature. Non-functional UI actively damages user trust.

### 5. 🟠 Create `.env.example` and database migrations
**Effort:** Small | **Risk reduction:** Medium

Create `.env.example`, run `prisma migrate dev` to generate migrations, and create a seed script. These are essential for any contributor to set up a working dev environment and for deploying to production.

---

## 6. Codebase Stats

| Metric | Value |
|--------|-------|
| **Files reviewed** | ~25+ source files |
| **Lines of code** | ~2,500+ (src/ + prisma/schema + config files) |
| **Pages** | 7 (login, dashboard, debt, payments, subscriptions, grab, shell) |
| **API routes** | 6 (auth, debt, debt/[id], debt/[id]/pay, payments, grab) |
| **Prisma models** | 5 (Debt, PaymentCalendar, GrabEntry, Subscription, MonthlyDashboard) |
| **Deployment** | Cloudflare Workers (Wrangler + OpenNext + D1) |
| **Auth library** | Better Auth (configured, unwired) |
| **UI framework** | shadcn/ui + Tailwind + Recharts |
| **Unique issues found** | 27 (5 Critical, 4 High, 8 Medium, 10 Low) |

---

*Audit consolidated by LIBRARIAN from EXPLORER and COUNCIL reports. 🏛️*
