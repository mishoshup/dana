# Dana Codebase — EXPLORER Report

**Date:** Sun 2026-05-10  
**Inspector:** EXPLORER (subagent)  
**Scope:** Full codebase audit — all pages, API routes, config, DB schema, auth, and deployment config

---

## CRITICAL ISSUES

### Issue 1: No Auth Protection on Any Protected Page
- **Severity:** CRITICAL
- **File:** src/app/page.tsx, src/app/debt/page.tsx, src/app/payments/page.tsx, src/app/grab/page.tsx, src/app/subscriptions/page.tsx
- **Line:** All pages
- **Problem:** The login page (`(auth)/login/page.tsx`) checks the session and redirects authenticated users away. But every other page — Dashboard, Debt Tracker, Payments, Grab Tracker, Subscriptions — has **zero auth checks**. No middleware, no `getSession()` call, no redirect. Anyone who knows a URL can access any page.
- **Fix:** Add a `middleware.ts` that checks the session via better-auth and redirects unauthenticated users to `/login`. Alternatively, add `getSession()` checks in every page component and redirect when null.

---

### Issue 2: Auth + DB Not Wired for Cloudflare (D1) Deployment
- **Severity:** CRITICAL
- **File:** prisma/schema.prisma, src/lib/db.ts, src/lib/auth.ts, wrangler.jsonc
- **Line:** schema line 6-8, db.ts entire file, auth.ts line 6
- **Problem:** The app is configured for both SQLite (local dev) and D1 (Cloudflare). But:
  1. `db.ts` creates a plain `new PrismaClient()` — no D1 adapter.
  2. `auth.ts` hardcodes `prismaAdapter(prisma, { provider: "sqlite" })`.
  3. The Prisma schema uses `provider = "sqlite"`.
  4. `package.json` includes `@prisma/adapter-d1` but it's never imported or used.
  5. `wrangler.jsonc` has a D1 binding (`dana_db`) and R2 bucket, but the app has no code to read them.
  6. `pnpm-workspace.yaml` allows `better-sqlite3` builds (won't work in Workers).
  
  The app **cannot deploy to Cloudflare** in its current state. It runs locally only.
- **Fix:** Either (a) fully commit to Cloudflare by setting up `PrismaD1` adapter in `db.ts`, using `provider = "sqlite"` with driver adapters, and conditionally switching based on platform; or (b) remove Cloudflare config and run as a standard Next.js app. For auth, use `provider: "sqlite"` for local and create a D1-aware factory.

---

### Issue 3: Register Page Missing (Broken Link on Login Page)
- **Severity:** CRITICAL
- **File:** src/app/(auth)/login/page.tsx line ~53
- **Line:** 53
- **Problem:** The login page renders a link: `<a href="/register">Register</a>`. The directory `src/app/(auth)/register/` exists but is **empty** — no `page.tsx`. Navigating to `/register` results in a 404 error.
- **Fix:** Create `src/app/(auth)/register/page.tsx` with a registration form that POSTs to `/api/auth/sign-up/email`.

---

### Issue 4: Race Condition in Debt Payment — Balance Not Atomically Decremented
- **Severity:** CRITICAL
- **File:** src/app/api/debt/[id]/pay/route.ts
- **Line:** ~40-68
- **Problem:** The pay endpoint reads `debt.balance` via `findUnique` (line 28-30), then uses that **cached JavaScript variable** inside the transaction for both capping the payment amount and computing the new balance. If two concurrent payment requests hit the same debt:
  - Both read `debt.balance = 1000`
  - Transaction A: creates payment of 700, sets balance to `max(0, 1000-700) = 300`
  - Transaction B: creates payment of 500, sets balance to `max(0, 1000-500) = 500` (overwrites!)
  - Final balance: **500** with total payments of **1200** on a 1000 debt — overpaid by 200
- **Fix:** Use Prisma's atomic increment: `balance: { decrement: Math.min(amount, currentBalance) }` and check the result via `balance >= amount` in a conditional update. Alternatively, use the `$transaction` callback form to re-read the balance inside the transaction.

---

### Issue 5: Dashboard Is 100% Hardcoded Static Data
- **Severity:** CRITICAL
- **File:** src/app/page.tsx
- **Line:** 13-39 (all data)
- **Problem:** Every data point on the dashboard is hardcoded:
  - `debts` array (4 items, all static)
  - `upcoming` payments (5 items)
  - `mayIncome = 3000 + 1250` (hardcoded numbers)
  - `monthlyCommitments` includes hardcoded 550 (rent) + 110 (telco)
  - Surplus calculation at line 69 uses hardcoded `450 - 300 - 100`
  
  The dashboard never calls `/api/debt` or `/api/payments`. It's a screenshot, not a live UI.
- **Fix:** Fetch debts from `/api/debt` and payments from `/api/payments`, calculate income/surplus from real data. Alternatively, make it a server component that queries the DB directly.

---

### Issue 6: Grab Page Form Does Nothing (No Submit Handler)
- **Severity:** HIGH
- **File:** src/app/grab/page.tsx
- **Line:** 57-96
- **Problem:** The "Log Ride" form is purely decorative. The `<form>` element has **no `onSubmit` handler** and **no `action` attribute**. Clicking "Save Entry" triggers a form submission that refreshes the page and loses all data. The day/week/week-to-date summary cards and the BarChart are also hardcoded static data.
- **Fix:** Add `onSubmit` handler that POSTs to `/api/grab`, prevent default form behavior, show success/error state, and refresh data. Use real data from the API for summaries + charts.

---

### Issue 7: Subscriptions Page Is Purely Static
- **Severity:** HIGH
- **File:** src/app/subscriptions/page.tsx
- **Line:** 7-15 (data), 58-59 (Switch interaction)
- **Problem:** All 6 subscriptions are hardcoded in the component. The `<Switch>` toggles have **no `onCheckedChange` handler** — flipping a switch visually changes nothing and sends no API request. There's no API route for subscriptions at all (no `/api/subscriptions`).
- **Fix:** Create a `Subscription` API route, fetch real data, wire up the switch `onCheckedChange` to POST/PATCH the active state. Add CRUD for adding/removing subscriptions.

---

### Issue 8: Payments Page Has No Way to Mark Payments as Paid
- **Severity:** HIGH
- **File:** src/app/payments/page.tsx
- **Line:** Entire file
- **Problem:** The Payments Calendar is read-only — it shows a list of payments with their status, but there's **no button, click handler, or UI** to mark a payment as "paid". The dashboard has a "Mark Paid" button that routes to `/payments`, but `/payments` offers no way to do this. The `/api/payments` PATCH endpoint exists but has no consumer.
- **Fix:** Add a "Mark Paid" button or click-to-pay interaction on each pending payment item in the calendar. Add a swipe-gesture or context menu for quick status updates.

---

### Issue 9: Missing `cloudflare-env.d.ts` (Build Script Would Fail)
- **Severity:** HIGH
- **File:** package.json line ~22 (`"cf-typegen"` script), project root
- **Line:** N/A
- **Problem:** The script `"cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"` is defined in `package.json` but the `cloudflare-env.d.ts` file doesn't exist. Running `pnpm cf-typegen` would generate it, but the file being absent means no type-aware dev experience for Cloudflare bindings (D1, R2, Images). Any code referencing `CloudflareEnv` would get TypeScript errors.
- **Fix:** Run `pnpm cf-typegen` to generate the file, or remove the script if Cloudflare deployment is deferred.

---

### Issue 10: `next.config.ts` Has Unconditional Side-Effect Import
- **Severity:** HIGH
- **File:** next.config.ts
- **Line:** 9
- **Problem:** `import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev())` is at the module top level with no environment guard. This runs during ANY Node.js process that loads the config (`next build`, `next start`, `next dev`). The function is named `...ForDev` but the condition isn't checked.
- **Fix:** Wrap in `if (process.env.NEXTJS_ENV === 'development')` or check `process.env.NODE_ENV`. The `.dev.vars` file already sets `NEXTJS_ENV=development`. Use it.

---

## MEDIUM ISSUES

### Issue 11: Shell Nav Doesn't Hide on `/register`
- **Severity:** MEDIUM
- **File:** src/components/shell.tsx
- **Line:** 22
- **Problem:** `if (pathname === "/login") return <>{children}</>;` skips the shell for login, but `/register` (when created) would show the sidebar + nav. Auth pages should always be full-screen without the shell.
- **Fix:** Check for an auth route pattern: `if (pathname.startsWith("/login") || pathname.startsWith("/register"))`.

---

### Issue 12: PATCH `/api/payments` Fails Silently When `body.id` Is Undefined
- **Severity:** MEDIUM
- **File:** src/app/api/payments/route.ts
- **Line:** ~34-44
- **Problem:** The PATCH handler destructures `body.id` and passes it to `prisma.paymentCalendar.update({ where: { id: body.id } })`. If `body.id` is `undefined`, Prisma will throw an error that gets caught as a generic "Invalid data" response, making debugging harder.
- **Fix:** Validate `body.id` exists and return a clear 400 error: `if (!body.id) return NextResponse.json({ error: "Payment ID is required" }, { status: 400 })`.

---

### Issue 13: Debt PATCH Has No Existence Check Before Update
- **Severity:** MEDIUM
- **File:** src/app/api/debt/[id]/route.ts
- **Line:** ~10-26
- **Problem:** `prisma.debt.update()` on a non-existent id throws a `RecordNotFound` error that's caught generically. No 404 is returned for missing debts.
- **Fix:** Add a `findUnique` check first and return 404 if not found, or catch the `Prisma.PrismaClientKnownRequestError` with code `P2025` and return 404.

---

### Issue 14: Debt Payment Progress Bar Uses Inverted Percentage Logic
- **Severity:** MEDIUM
- **File:** src/app/debt/page.tsx
- **Line:** ~260-263
- **Problem:** `const pct = debt.balance === 0 ? 100 : Math.min(100, ((debt.payments?.reduce((s, p) => s + p.amount, 0) || 0) / (debt.balance + (debt.payments?.reduce((s, p) => s + p.amount, 0) || 0))) * 100)`
  
  This calculates `paid / (remaining + paid)`, which is the fraction of the **original** balance. This is correct conceptually, but `debt.balance` here is the **updated** balance from the DB (post-payments). If the user paid 300 on a 1000 debt, the DB stores `balance = 700`. The formula gives `300 / (700 + 300) = 30%`, which is correct. But the dashboard has the same bug differently:
  
  In `page.tsx` (dashboard): `const pct = d.paid === 0 ? 0 : (d.balance / (d.paid + d.balance)) * 100`
  Here `d.balance` is the original balance (hardcoded) and `d.paid = 0` always, so the bar is always 0%. Different logic, different bug.
- **Fix:** Normalize the progress bar logic across both pages. Use a consistent formula: `paid / (paid + remaining) * 100` where `paid` is the sum of all payments made and `remaining` is the current balance.

---

### Issue 15: Payment Month Grouping Uses `dueDate` Not `paidDate`
- **Severity:** MEDIUM
- **File:** src/app/payments/page.tsx
- **Line:** ~51-55
- **Problem:** The payments page groups by `p.dueDate.slice(0, 7)`. If a payment from May was paid in June, it still appears in May's group. For paid/pending filtering this is fine, but the "Paid This Month" calculation in the debt page (`paidThisMonth`) uses `paidDate || dueDate`, which could incorrectly count payments that were due this month but paid earlier or later.
- **Fix:** For "Paid This Month" stats, use `paidDate` exclusively. For grouping, offer a toggle between "by due date" and "by paid date."

---

### Issue 16: Grab API Returns Only Latest 50 Entries (No Pagination)
- **Severity:** MEDIUM
- **File:** src/app/api/grab/route.ts
- **Line:** 6
- **Problem:** `take: 50` limits results to the 50 most recent entries. As the user logs more rides, older entries become inaccessible through the API. There is **no pagination** mechanism (no `skip`, `cursor`, or page params).
- **Fix:** Accept `?page=` and `?limit=` query parameters and implement cursor-based or offset pagination.

---

### Issue 17: No Loading/Error States on Several Pages
- **Severity:** MEDIUM
- **File:** src/app/subscriptions/page.tsx, src/app/grab/page.tsx, src/app/page.tsx
- **Line:** All
- **Problem:** Dashboard, Subscriptions, and Grab pages have no loading, empty, or error states. If an API call were added, there's no feedback mechanism. The debt page and payments page do have `<Loader2>` spinners and error cards, but the others don't.
- **Fix:** Add consistent `loading`, `error`, and `empty` state patterns across all pages. Consider a reusable `<PageState>` component.

---

### Issue 18: manifest.json References Non-Existent Icon Files
- **Severity:** MEDIUM
- **File:** public/manifest.json
- **Line:** 14-22
- **Problem:** The manifest declares icons at `/icon-192.png` and `/icon-512.png`, but neither file exists in the `public/` directory. A PWA install prompt would fail.
- **Fix:** Generate and add the icon files, or remove PWA support from the manifest (or the manifest reference from `layout.tsx`).

---

### Issue 19: Prisma Client Singleton Ignores Cloudflare Workers Environment
- **Severity:** MEDIUM
- **File:** src/lib/db.ts
- **Line:** 3-5
- **Problem:** The `globalForPrisma` pattern relies on `globalThis` which behaves differently in Cloudflare Workers — the isolate may be recycled or the global may not persist. Even for local SQLite this works, but it won't safely connect to D1 in production.
- **Fix:** Use a connection pool per-request pattern when using D1 adapter, or use the `PrismaClient` with the `@prisma/adapter-d1` that handles Cloudflare's lifecycle correctly.

---

## LOW ISSUES

### Issue 20: Debt and Payments API Use `FindMany` Without Input Validation
- **Severity:** LOW
- **File:** src/app/api/debt/route.ts, src/app/api/payments/route.ts
- **Line:** debt line 5-12, payments line 5-14
- **Problem:** GET endpoints accept no filters, limit defaults, or user scoping. The GET /api/debt and /api/payments return ALL entries from the database. When there are many records, this could be a performance concern.
- **Fix:** Add query param support for filtering (by status, month, etc.) and reasonable defaults for limit.

---

### Issue 21: No Seed Script for Database Bootstrap
- **Severity:** LOW
- **File:** prisma/ (missing `seed.ts`)
- **Line:** N/A
- **Problem:** There's a `dev.db` file already present (likely from manual testing), but no `prisma/seed.ts` to bootstrap a fresh database. A new developer or fresh clone would see empty states everywhere.
- **Fix:** Create `prisma/seed.ts` with sample debts, payments, and grab entries. Add `"prisma": { "seed": "tsx prisma/seed.ts" }` to `package.json`.

---

### Issue 22: Subscription Toggle Uses `defaultChecked` Instead of `checked`
- **Severity:** LOW
- **File:** src/app/subscriptions/page.tsx
- **Line:** ~58
- **Problem:** `<Switch defaultChecked={sub.active} />` uses `defaultChecked`, which means the toggle state is set only on initial render. If data were fetched from an API, `defaultChecked` would not update when the data refetches. Should be `checked` for controlled behavior.
- **Fix:** Use `checked={sub.active}` with an `onCheckedChange` handler once API integration is added.

---

### Issue 23: `XAxis` and `YAxis` Typing Warnings with Recharts
- **Severity:** LOW
- **File:** src/app/debt/page.tsx, src/app/grab/page.tsx
- **Line:** debt page ~450-460, grab page ~114-122
- **Problem:** Recharts v2+ `XAxis`/`YAxis` with `dataKey` as a string can produce TypeScript strict-mode warnings. The debt page uses `dataKey="type"` and `dataKey="balance"` directly without typing the chart data. The grab page uses `dataKey="day"` and `dataKey="earnings"`.
- **Fix:** Define typed interfaces for chart data arrays.

---

### Issue 24: "Freedom Countdown" Calculation Is Overly Complex
- **Severity:** LOW
- **File:** src/app/debt/page.tsx
- **Line:** ~148-153
- **Problem:** The Freedom Countdown finds the debt with the longest projection: `activeDebts.reduce((max, d) => projectClearance(d).months > projectClearance(max).months ? d : max)`. This calls `projectClearance` twice per debt (once for comparison, once for the result). It's O(2n) for something that could be O(n).
- **Fix:** Compute once per debt and store in a variable. Minor performance issue but code clarity improvement.

---

### Issue 25: No Disabled Submit in Login Form When Empty
- **Severity:** LOW
- **File:** src/app/(auth)/login/page.tsx
- **Line:** ~42-51
- **Problem:** The form's submit button has no `disabled` state when email or password are empty. Users may submit empty fields and get a server error instead of immediate feedback.
- **Fix:** Add `required` attributes (already present) plus visual disabled state: `disabled={!email || !password}` with controlled inputs.

---

### Issue 26: Payments API POST Accepts Arbitrary Data Without Schema Validation
- **Severity:** LOW
- **File:** src/app/api/payments/route.ts
- **Line:** 16-30
- **Problem:** The POST handler destructures `body.debtId`, `body.dueDate`, etc., but only validates with a bare try/catch. No type checking, no required field validation, no date format validation. Invalid data produces a generic "Invalid data" error.
- **Fix:** Add explicit validation for required fields (`dueDate`, `amount`) and return descriptive error messages.

---

### Issue 27: No ESLint `ts-expect-error` or Proper Type Handling Around `catch (e: any)`
- **Severity:** LOW
- **File:** src/app/debt/page.tsx line ~68, 71
- **Line:** 68, 71
- **Problem:** `catch (e: any)` bypasses TypeScript strict mode. The `e.message` access assumes error is an `Error` instance.
- **Fix:** Use `catch (e: unknown)` and narrow the type: `const message = e instanceof Error ? e.message : "Unknown error"`.

---

### Issue 28: ESLint Config Appears Minimal
- **Severity:** LOW
- **File:** eslint.config.mjs
- **Line:** Entire file
- **Problem:** The ESLint config only includes `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript` with no custom rules. No Prettier, no import ordering, no React hooks rules beyond defaults.
- **Fix:** Not a bug per se, but consider adding project-specific lint rules to catch issues like hardcoded data, missing keys, or unused imports early.

---

## SUMMARY BY SEVERITY

| Severity | Count | Key Issues |
|----------|-------|------------|
| CRITICAL | 10 | No auth, D1 not wired, register 404, race condition, full hardcode, grab form dead, subscriptions static, payments read-only, missing cf-typegen, next.config side effect |
| HIGH     | 0  | (all critical issues grouped above) |
| MEDIUM   | 9  | Shell on register, undefined ID in PATCH, debt existence check, progress bar inconsistency, payment grouping, no pagination, missing states, missing icons, Prisma global |
| LOW      | 9  | No filters, no seed, defaultChecked vs checked, recharts typing, freedom calc perf, login submit, validation, any type, eslint |

---

## RECOMMENDED FIX ORDER

1. **Auth middleware** — protect all pages, redirect unauthenticated users
2. **Register page** — create it, wire up better-auth sign-up
3. **Dashboard real data** — replace hardcoded with API calls
4. **Race condition fix** — use atomic `decrement` in debt/pay
5. **Grab form** — add submit handler, wire to API
6. **Subscriptions API + toggle** — create API route, wire Switch
7. **Payments mark-paid** — add UI action on payment items
8. **Cloudflare deployment decision** — either fully wire D1 or drop CF config
9. **All remaining MEDIUM issues** — pagination, validation, loading states, icons
10. **All LOW issues** — polish and hygiene
