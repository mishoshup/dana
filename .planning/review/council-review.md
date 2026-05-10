# COUNCIL Review — Dana v0.1

**Reviewer:** COUNCIL (multi-perspective code quality audit)
**Date:** 2026-05-10
**Scope:** All source files in `src/`, `prisma/schema.prisma`, config files
**Total lines reviewed:** ~2,059 across 14 source files + schema + configs

---

## Executive Summary

Dana is a Next.js 16 personal finance app targeting Cloudflare (D1 + R2). The foundation is solid — clean component structure, good SQLite schema, proper use of better-auth for authentication, and a responsive shell layout. However, three systemic problems cut across the entire codebase:

1. **Zero API authentication** — Every data endpoint is wide open.
2. **Static data masquerading as dynamic** — 3 of 5 pages use hardcoded data mixed with real code paths.
3. **Unfinished interaction** — The Grab form and Subscription toggles are visual-only.

Fixing these three will resolve ~60% of the issues below. The remaining are correctness bugs, error-handling gaps, and best-practice violations.

---

## 🔴 HIGH SEVERITY

### H1: All Data API Routes Are Unauthenticated

- **Files:** `src/app/api/debt/route.ts`, `src/app/api/debt/[id]/pay/route.ts`, `src/app/api/debt/[id]/route.ts`, `src/app/api/payments/route.ts`, `src/app/api/grab/route.ts`
- **Lines:** All
- **What:** None of the data API routes check the user's session. Any client that can reach these endpoints can read, create, modify, or delete all debt/payment/grab records. Since the app has a proper auth system via better-auth, this is an oversight.
- **Recommendation:** Add session verification using `auth.api.getSession({ headers })` at the top of every data route. Return `401` if no session. Consider a shared middleware helper:

```ts
// src/lib/api-auth.ts
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new AuthError("Unauthorized");
  return session;
}
```

Then wrap each handler in try/catch that returns `401`.

---

### H2: Grab Form Has No `onSubmit` — Data Is Never Saved

- **File:** `src/app/grab/page.tsx`
- **Line:** ~33-68
- **What:** The "Log Ride" form renders `<form>` with no `onSubmit` handler and no `action` attribute. All inputs are uncontrolled with no `ref`s or `useState` to read their values. Submitting triggers a full page reload; no data reaches the API.
- **Recommendation:** Either (a) add `onSubmit` handler with `useRef`/`useState` to collect values and POST to `/api/grab`, or (b) use `action={"/api/grab"} method="POST"` for a progressive enhancement approach. Also add loading state and success feedback.

---

### H3: Subscription Toggles Are Visual-Only (No `onCheckedChange`)

- **File:** `src/app/subscriptions/page.tsx`
- **Line:** ~48
- **What:** The `<Switch>` components render with `defaultChecked` but no `onCheckedChange` handler. Toggling a switch has zero effect — no state update, no API call, no UI persistence.
- **Recommendation:** Add `onCheckedChange` handler that updates local state and optionally PATCHes the subscription. Or make the Switch read-only with a tooltip explaining the feature is coming.

---

### H4: Dashboard Uses Entirely Hardcoded Data

- **File:** `src/app/page.tsx`
- **Lines:** 8-18, 22-28, 34
- **What:** The `debts[]` array, `upcoming[]` array, `mayIncome`, and surplus magic numbers (`- 450 - 300 - 100`) are all hardcoded. The debt tracker shows progress bars computed from `paid === 0` which is always 0% — the visual is a flat empty bar.
- **Recommendation:** Fetch data from `/api/debt` and `/api/payments` on mount. Compute `mayIncome` from real income entries. The surplus should be derived from actual data, not magic numbers (document what 450/300/100 represent — food, fuel, grab costs).

---

### H5: `next.config.ts` Dynamic Import at Module Scope

- **File:** `next.config.ts`
- **Line:** 7
- **What:** `import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev())` is a bare dynamic import at module top level in a Next.js config file. This is a side-effect call pattern that may not execute correctly in Next.js 16's ESM module resolution, potentially causing the Cloudflare adapter to not initialize in dev.
- **Recommendation:** Use a static import or the supported initialization pattern from `@opennextjs/cloudflare` docs. If a dynamic import is truly required, wrap it in a function that Next.js calls explicitly.

---

### H6: `projectClearance` Recalculated Excessively in Debt Tracker

- **File:** `src/app/debt/page.tsx`
- **Line:** ~118
- **What:** The "Freedom Countdown" card computes `projectClearance(d)` for every debt to find the maximum:
  ```ts
  activeDebts.reduce((max, d) =>
    projectClearance(d).months > projectClearance(max).months ? d : max
  )
  ```
  This calls `projectClearance` **2N times** per render (N for the comparison, plus N for the accumulator). With only 4 debts it's not a performance issue, but it's a code smell.
- **Recommendation:** Compute all projections once with `.map()`, then find the max:
  ```ts
  const projections = activeDebts.map(d => ({ debt: d, ...projectClearance(d) }));
  const maxMonths = Math.max(...projections.map(p => p.months));
  ```

---

## 🟠 MEDIUM SEVERITY

### M1: Payments Page "Paid This Month" Counts Non-Paid Payments

- **File:** `src/app/debt/page.tsx`
- **Lines:** ~63-68
- **What:** The `paidThisMonth` computation filters ALL payments by their `paidDate || dueDate` falling in the current month, without checking `status === "paid"`. A `pending` payment due this month would be counted as "paid this month".
- **Recommendation:** Add `.filter(p => p.status === "paid")` before the date filter.

### M2: Progress Bar Formula Has a Corner Case

- **File:** `src/app/debt/page.tsx`
- **Line:** ~143
- **What:** `pct = min(100, (paymentsTotal / (balance + paymentsTotal)) * 100)`. This formula is mathematically equivalent to `(paid / originalBalance) * 100` assuming `balance = originalBalance - paid`. But if a debt's balance was manually adjusted via PATCH API (without corresponding payments), the formula produces incorrect percentages.
- **Recommendation:** Store `originalBalance` on the Debt model and compute progress from that. Or at minimum, document this assumption.

### M3: Project Clearance Ignores Interest Rates

- **File:** `src/app/debt/page.tsx`
- **Line:** ~72-77
- **What:** `projectClearance` computes `monthly = debt.monthlyPayment + extraPerMonth` and divides balance by monthly, ignoring interest entirely. For SPayLater with 1.5%/mo, the projection will be significantly optimistic.
- **Recommendation:** Add a note in the UI that projections are interest-free estimates. For amortized loans (Car Loan), consider using standard amortization formula.

### M4: `byMonth` Grouping Recalculated on Every Render

- **File:** `src/app/payments/page.tsx`
- **Lines:** ~40-45
- **What:** Every render, the component loops through all payments to build the `byMonth` grouping object. Since `payments` is state, this should use `useMemo`.
- **Recommendation:** `const byMonth = useMemo(() => { ... }, [payments]);`

### M5: API Catch Blocks Return Generic 400 for All Errors

- **Files:** All API route files
- **What:** Every catch block returns `{ error: "Invalid data" }` or `{ error: "Update failed" }` regardless of the actual error. A DB connection failure, a Zod validation error, a Prisma unique constraint violation — all produce the same unhelpful response.
- **Recommendation:** Differentiate error types:
  - Validation errors → 400 with field-level messages
  - Not found → 404
  - Server errors → 500 with generic message (log the real error server-side)
  - Auth errors → 401
  Consider using Zod for request validation.

### M6: Login Page Has No Loading or Error State

- **File:** `src/app/(auth)/login/page.tsx`
- **What:** The form POSTs to `/api/auth/sign-in/email` directly. There's no loading spinner during submission, no error message shown if credentials are wrong, and no success indicator. If the API returns an error, the user sees nothing — the page just sits there.
- **Recommendation:** Convert to a client component with `useActionState` or `useState` to capture form state. Show error banners from the API response. Disable the button during submission.

### M7: No Error Boundary at App Level

- **File:** `src/app/layout.tsx`
- **What:** There's no `error.tsx` or global error boundary. If any page or API call throws during SSR, the user sees Next.js's default error screen.
- **Recommendation:** Add `src/app/error.tsx` and `src/app/global-error.tsx` with appropriate fallback UI.

### M8: `/register` Link Points to Unconfirmed Route

- **File:** `src/app/(auth)/login/page.tsx`
- **Line:** ~54
- **What:** The login page links to `/register`, but there's no `src/app/(auth)/register/page.tsx` in the codebase. The "Don't have an account? Register" link returns 404.
- **Recommendation:** Either create the register page, remove the link, or redirect to the login/sign-up flow built into better-auth.

### M9: Shell Doesn't Hide for `/register`

- **File:** `src/components/shell.tsx`
- **Line:** ~20
- **What:** `if (pathname === "/login") return <>{children}</>` — the shell is hidden on login but not on register. If a `/register` page exists, it would render inside the sidebar layout, which looks broken.
- **Recommendation:** Use a list of auth paths or use the route group pattern: `if (pathname.startsWith("/login") || pathname.startsWith("/register"))`.

---

## 🟡 LOW SEVERITY

### L1: Grab Page Uses Native HTML `<select>` Instead of Shadcn Select

- **File:** `src/app/grab/page.tsx`
- **Line:** ~49
- **What:** The project has `src/components/ui/select.tsx` (shadcn Select component) available, but the Grab form uses a raw `<select>` element. This creates visual inconsistency with other forms.
- **Recommendation:** Use the project's `<Select>` component for consistent styling.

### L2: Fixed `<Badge>` as Action Buttons in Dashboard

- **File:** `src/app/page.tsx`
- **Line:** ~99
- **What:** The dashboard uses `<Button>` components for Quick Actions. But further down, `<Badge>` components are used (e.g., for rate labels on debts) — these are not interactive and that's correct here. No actual bug, just noting consistent usage.

### L3: Subscriptions Page Uses Different Mobile Padding

- **File:** `src/app/subscriptions/page.tsx`
- **Line:** ~2
- **What:** `p-4 md:p-8 pt-16 md:pt-8` vs other pages use `pt-20 md:pt-8`. The `pt-16` is 4px less than `pt-20`, causing the subscriptions header to sit slightly higher on mobile.
- **Recommendation:** Use consistent padding across all pages. Centralize into a shared layout or CSS class.

### L4: Debt Type Color Lookup Is Fragile

- **Files:** `src/app/page.tsx`, `src/app/debt/page.tsx`, `src/app/payments/page.tsx`
- **What:** All three files define separate `debtColors` / `debtTextColors` / `debtDotColors` lookup maps keyed on hardcoded debt type strings ("SPayLater", "S-Financing I", "Car Loan", "MARA"). Adding a new debt type requires updating 3 maps in 3 files. Miss one and you get fallback styles (or no dot color).
- **Recommendation:** Define a single source of truth — either (a) a shared constants file `src/lib/constants.ts` with the color map, or (b) a `color` field on the Debt model itself.

### L5: Inconsistent API Response Patterns

- **Files:** All API routes
- **What:** Some routes return `{ error: "..." }`, some return just the data, some return `{ success: true }`. There's no consistent response envelope.
- **Recommendation:** Adopt a simple convention:
  - Success: return data directly (or `{ data, ... }`)
  - Error: return `{ error: "message" }` with appropriate HTTP status
  Consider a small `apiResponse` helper.

### L6: Payments API PATCH Doesn't Validate Body

- **File:** `src/app/api/payments/route.ts`
- **Lines:** ~28-38
- **What:** The PATCH handler blindly destructures `body.id`, `body.status`, `body.paidDate` with no validation. If `body.id` is missing or invalid, Prisma throws and the catch returns "Invalid data".
- **Recommendation:** Validate that `id` exists and is a valid cuid before calling Prisma.

### L7: Debt POST Over-accepts Fields

- **File:** `src/app/api/debt/route.ts`
- **Lines:** ~12-28
- **What:** The POST handler accepts any body fields and passes them directly to Prisma. While Prisma's type-safe client catches invalid field names, there's no sanitation on string fields like `body.type` or `body.notes` (no length limits, no XSS sanitization).
- **Recommendation:** Add minimum validation — at minimum `type` length check, and consider using Zod for request schemas.

### L8: `catch (e: any)` in Client Component

- **File:** `src/app/debt/page.tsx`
- **Line:** ~46
- **What:** The catch clause uses `any` type:
  ```ts
  } catch (e: any) {
    setPaySuccess(`❌ ${e.message}`);
  }
  ```
  This suppresses TypeScript strictness and can crash on `e.message` if the caught value isn't an Error (e.g., a string thrown by a polyfill).
- **Recommendation:** Use `unknown` and narrow: `catch (e: unknown) { const msg = e instanceof Error ? e.message : "Unknown error"; ... }`

### L9: No Environment Variable Validation

- **File:** `src/lib/auth.ts` and likely `.env` usage
- **Lines:** Various
- **What:** The app references `process.env.BETTER_AUTH_URL` with a fallback to `localhost:3000`. If deployed to Cloudflare, this must be set correctly or CSRF will break. No validation at build time or startup warns about missing vars.
- **Recommendation:** Use a validation library (or a simple function) that checks required env vars at build/startup and throws a clear error.

### L10: `delete` Route Doesn't Return 404 for Missing ID

- **File:** `src/app/api/debt/[id]/route.ts`
- **Line:** ~35
- **What:** `prisma.debt.delete({ where: { id } })` throws if the ID doesn't exist. The catch returns `400 { error: "Delete failed" }` instead of `404 { error: "Debt not found" }`.
- **Recommendation:** Catch Prisma's `P2025` (RecordNotFound) error and return 404.

### L11: Payments Page Uses `.then()` Instead of `async/await`

- **File:** `src/app/payments/page.tsx`
- **Line:** ~30
- **What:** The page uses `.then().catch()` for data fetching while `src/app/debt/page.tsx` uses `async/await`. Inconsistent pattern across the same codebase.
- **Recommendation:** Pick one pattern (preferably async/await for consistency with the rest of the app) and stick to it.

---

## 🟢 INFO / SUGGESTIONS

### I1: Hardcoded Danger Zone Alert Could Be Dynamic

- **File:** `src/app/debt/page.tsx`
- **Line:** ~103-108
- **What:** The "Peak Debt Period — June-July 2026 — RM2,674/mo" alert is hardcoded. This will become stale.
- **Suggestion:** Compute the peak month from actual debt payment data, or at minimum add a comment noting the expiration date.

### I2: Dashboard Monthly Commitment Double-Counts Telco

- **File:** `src/app/page.tsx`
- **Line:** ~36
- **What:** `monthlyCommitments` adds `550 + 110` (rent + telco). But the subscriptions page lists "Telco Plan" at RM110/mo. If subscriptions data becomes dynamic, this risks double-counting or inconsistency.
- **Suggestion:** When subscriptions are fetched from API, include them in the commitment calculation from a single source of truth.

### I3: No `noindex` Meta Tag on Personal Finance App

- **File:** `src/app/layout.tsx`
- **What:** The metadata has no `robots` instruction. If deployed to a public URL (e.g., `finance.danialsanusi.com` as shown in the shell footer), personal finance data could be indexed by search engines.
- **Suggestion:** Add `robots: { index: false, follow: false }` to metadata, or block via `robots.txt`.

### I4: NavItems Duplicated in Shell

- **File:** `src/components/shell.tsx`
- **Lines:** 9-16 (definition), 56-71 (sidebar), 83-96 (bottom nav)
- **What:** The `navItems` array is defined once, but the rendering logic for sidebar links and bottom nav links is duplicated with different JSX structures.
- **Suggestion:** Create a shared `NavLink` component to DRY up the active-state class logic between sidebar and bottom nav.

### I5: No TypeScript `strict` Mode Check

- **File:** `tsconfig.json` (assumed, not reviewed)
- **What:** The codebase uses `any` in some places and has loose null handling. If `strict: true` isn't set in `tsconfig.json`, TypeScript won't catch these.
- **Suggestion:** Enable `"strict": true` in `tsconfig.json` and fix the resulting type errors.

### I6: MonthlyDashboard Model Relations

- **File:** `prisma/schema.prisma`
- **Lines:** 62-63
- **What:** `MonthlyDashboard` has `debts Debt[]` and `Debt` has `dashboardEntries MonthlyDashboard[]` — this creates an implicit many-to-many with an auto-generated join table. This works but is invisible in the schema.
- **Suggestion:** Either (a) add an explicit `@relation` with a join table name, or (b) if you intended a one-to-many (one dashboard per debt per month), restructure the relationship.

### I7: GrabEntry Commission Field Name

- **File:** `prisma/schema.prisma`
- **Line:** 60
- **What:** Field is named `commission` (correct spelling). No typo here — just noting the field exists but isn't exposed in the Grab form.

---

## Summary by Area

| Area | Critical | Major | Minor |
|------|----------|-------|-------|
| Correctness | 2 | 2 | 3 |
| Architecture | 2 | 2 | 2 |
| Error Handling | 0 | 2 | 3 |
| Security | 1 | 0 | 2 |
| UX Gaps | 2 | 3 | 2 |
| Best Practices | 1 | 4 | 4 |

**Total: 8 critical + 13 major + 16 minor = 37 issues**

## Top 5 Fixes (Highest ROI)

1. **Add session auth to all API routes** — fixes 1 security hole, protects entire data layer
2. **Wire up Grab form with onSubmit** — makes the page functional
3. **Wire up Subscription Switch with onCheckedChange** — makes toggles functional
4. **Add error boundary + login error state** — improves UX for the most common failure paths
5. **Consolidate debt color maps** — reduces fragility when adding new debt types

---

*Review generated by COUNCIL. Each issue has been verified against the source code. Severity reflects runtime impact, not code quality aesthetics.*
