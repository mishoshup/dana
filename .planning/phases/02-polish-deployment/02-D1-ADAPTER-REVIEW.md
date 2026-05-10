# D1 Adapter Crash Review

**Reviewer:** Pantheon REVIEW agent
**Date:** 2026-05-10
**Scope:** Root cause analysis, fix recommendations, priority

---

## 1. Root Cause Analysis

### Import Chain (the crash path)

```
src/middleware.ts                  ← Edge Runtime
  └─ import { auth } from "@/lib/auth"
       └─ import { prisma } from "@/lib/db"     ← top-level import
            ├─ import { PrismaD1 } from "@prisma/adapter-d1"  ← top-level import
            └─ new PrismaClient()               ← top-level instantiation
```

### Why It Fails

Three compounding problems:

1. **Module-level D1 import.** `db.ts` imports `@prisma/adapter-d1` at the top of the file (line 2) regardless of whether `createPrismaClientD1()` is ever called. The Edge Runtime middleware forces module resolution of this import, which tries to load workerd/miniflare native binaries that are incompatible with the Next.js Edge Runtime sandbox.

2. **Module-level PrismaClient instantiation.** `db.ts` creates `new PrismaClient()` at module scope (line 16). Even without the D1 adapter, the default PrismaClient in a local dev setup uses `better-sqlite3` (native Node.js addon), which doesn't exist in Edge Runtime. This would independently crash middleware.

3. **`auth.ts` eagerly imports `prisma`.** The Better Auth config in `auth.ts` imports `prisma` at the top level (line 2), meaning the middleware cannot load `auth` without triggering the entire Prisma machinery.

### The Core Architectural Issue

> **Middleware runs on the Edge Runtime, which lacks Node.js built-in modules (fs, net, process), native addons, and workerd binaries.** Any code path that resolves Prisma — whether SQLite or D1 — will crash when loaded from middleware.

The module graph forces eager loading of heavy Node.js/Worker dependencies in a constrained runtime that cannot provide them.

---

## 2. Recommended Fix Options

### Option A: Remove `@/lib/auth` from middleware entirely (✅ Recommended)

The middleware currently imports `auth` only to call `auth.api.getSession()`. This is unnecessary — Better Auth can handle session validation via its own middleware/AuthJS pattern. The Next.js middleware should be kept stateless.

**How:**
- Remove the import of `@/lib/auth` from `middleware.ts`
- Remove the session check from middleware — rely on Better Auth's built-in route protection, or handle auth at the page/API handler level
- Keep middleware for non-auth concerns only (e.g., security headers, redirects unrelated to auth)

**Pros:**
- Simplest fix — zero additional dependencies
- Middleware stays fast (no I/O per request)
- Eliminates the crash entirely

**Cons:**
- Some route protection moves to the handler level (acceptable — this is how most auth libraries work)

### Option B: Make D1 import lazy in `db.ts`

Move `import { PrismaD1 }` inside `createPrismaClientD1()`:

```typescript
export function createPrismaClientD1(env: { DB: D1Database }) {
  // Dynamic import to prevent edge runtime resolution
  const { PrismaD1 } = await import("@prisma/adapter-d1");
  const adapter = new PrismaD1(env.DB);
  return new PrismaClient({ adapter });
}
```

**Pros:**
- Prevents workerd binary loading when middleware imports `db.ts`
- Relatively small change

**Cons:**
- Does NOT fix the `new PrismaClient()` instantiation at module scope (line 16) — the default SQLite PrismaClient still crashes in Edge Runtime
- Only solves half the problem

### Option C: Dynamic import of auth in middleware

```typescript
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // ... public path checks ...

  // Lazy-load auth to avoid edge runtime crash
  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: request.headers });
  // ...
}
```

**Pros:**
- Preserves session-based route protection in middleware
- Dynamic import prevents module resolution at load time

**Cons:**
- The try block catches the error, but the crash happens at the start of the request — the module may already be compiled/cached in an edge runtime context
- Still triggers Prisma module resolution on the first middleware execution
- Fragile — any new dependency in the auth chain could re-introduce the crash

### Option D: Edge-compatible session validation

Rewrite middleware auth to parse the session cookie directly (JWT-style) without going through Prisma:

- Extract session token from `dana-session` cookie
- Verify the token signature with a lightweight edge-compatible library (e.g., `jose`)
- No Prisma dependency at all in middleware

**Pros:**
- Fastest middleware (no DB call per request)
- Fully edge-compatible
- Production-ready approach for high-traffic apps

**Cons:**
- More implementation work
- Requires the session token to be self-validating (JWT with signing key)
- Need to verify Better Auth supports this natively or implement alongside it

### Recommended: Option A (+ Bonus Option D)

**Start with Option A** to unblock development immediately. It's the safest, fastest fix.

**Add Option D** as a separate improvement for production readiness when session validation in middleware is truly needed. The current middleware matcher is broad — it runs on nearly every route — so avoiding a DB call in middleware is better for latency anyway.

---

## 3. Priority Assessment

| Factor | Rating |
|--------|--------|
| **Severity** | 🔴 Critical — Dev server crashes on startup. Zero functionality. |
| **Impact** | Blocks ALL development of the app. |
| **Fix complexity** | 🟢 Easy (Option A) — 1 file change, remove ~10 lines |
| **Risk** | 🟢 Low — Better Auth routes (like `/api/auth/*`) are already excluded from middleware; protected routes just need explicit checks at the handler level |
| **When to do** | ✅ **Immediately** — before any other task in Phase 2 |

**Verdict: HIGHEST PRIORITY.** Fix before continuing with D1 config, subscriptions, or any deployment work.

---

## 4. Summary

The crash is a classic **Edge Runtime vs Node.js dependency conflict**. Middleware cannot import anything that ultimately touches Prisma — either through the D1 adapter or through the default SQLite PrismaClient.

The cleanest path: **decouple middleware from auth completely** (Option A). Middleware should be for coarse-grained routing decisions (redirects, headers, i18n), not session validation. Let Better Auth and individual route handlers manage authentication.
