# Architecture

**Analysis Date:** 2026-05-10

## System Overview

Dana is a personal finance single-page application built on Next.js 16 App Router. It uses Better Auth for authentication, Prisma ORM against SQLite (local) / Cloudflare D1 (production), and shadcn/ui for UI components. The frontend is React Server Components + Client Components, with REST API routes for all data mutations.

## High-Level Architecture

```
                       ┌─────────────────────────┐
                       │     Cloudflare D1        │  (prod)
                       │     SQLite (dev.db)      │  (local)
                       └──────────┬──────────────┘
                                  │ Prisma ORM
                       ┌──────────▼──────────────┐
                       │   Next.js API Routes     │
                       │   /api/debt/*            │
                       │   /api/grab/*            │
                       │   /api/payments/*        │
                       │   /api/auth/*            │
                       └──────────┬──────────────┘
                                  │ fetch()
              ┌───────────────────┼───────────────────┐
              │                   │                   │
     ┌────────▼────────┐  ┌──────▼──────┐  ┌────────▼────────┐
     │  Server Pages   │  │ Client Pages │  │  Auth Middleware │
     │  (RSC)          │  │ (useEffect)  │  │  (requireAuth)   │
     └─────────────────┘  └──────┬──────┘  └─────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   UI Components          │
                    │   shadcn/ui + base-ui    │
                    │   Shell (nav, sidebar,   │
                    │   bottom nav)            │
                    └─────────────────────────┘
```

## Components

| Component | Location | Responsibility |
|-----------|----------|----------------|
| Root layout | `src/app/layout.tsx` | Dark theme, global CSS, Shell wrapper |
| Shell | `src/components/shell.tsx` | Sidebar nav, mobile bottom nav, main content slot |
| Auth config | `src/lib/auth.ts` | Better Auth server instance, prisma adapter |
| DB config | `src/lib/db.ts` | PrismaClient singleton (local) |
| Auth helpers | `src/lib/auth-helpers.ts` | `requireAuthTuple()` middleware for API routes |
| UI primitives | `src/components/ui/*` | shadcn/ui generated components |
| Dashboard | `src/app/page.tsx` | Home page — debt cards, payments list, grab chart |
| Debt tracker | `src/app/debt/page.tsx` | Debt CRUD, payment logging, bar chart |
| Grab income | `src/app/grab/page.tsx` | E-hailing income entry, chart, monthly summary |
| Payments | `src/app/payments/page.tsx` | Upcoming/paid payment calendar |
| Subscriptions | `src/app/subscriptions/page.tsx` | List subscriptions with cost/rating |
| Login | `src/app/(auth)/login/page.tsx` | Login form |
| Register | `src/app/(auth)/register/page.tsx` | Sign-up form |

## Data Flow

### Authentication Flow

```
Login form → /api/auth/sign-in/email (Better Auth)
  → Prisma User table → Session cookie set
  → All API routes check requireAuthTuple() → decode session
  → If invalid → 401 response
```

### Data CRUD Flow

```
Client Page → fetch("/api/debt") → Next.js Route Handler
  → requireAuthTuple() → rejects if no session
  → prisma.debt.findMany() → returns JSON
  → Client renders cards/charts
```

```
Client Form → POST /api/debt → Route Handler
  → requireAuthTuple() → validates body
  → prisma.debt.create() → returns created record
  → Re-fetch list
```

## Route Structure

### Pages (App Router)

| Route | Type | Purpose |
|-------|------|---------|
| `/` | Client (use client) | Dashboard overview |
| `/debt` | Client | Debt tracker |
| `/grab` | Client | Grab/e-hailing income log |
| `/payments` | Client | Payment calendar |
| `/subscriptions` | Client | Subscription management |
| `/login` | Client | Auth page (no Shell) |
| `/register` | Client | Registration page |

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/debt` | GET | List all debts with recent payments |
| `/api/debt` | POST | Create new debt |
| `/api/debt/[id]` | GET | Single debt detail |
| `/api/debt/[id]` | DELETE | Delete a debt |
| `/api/debt/[id]/pay` | POST | Log a payment against a debt |
| `/api/grab` | GET | List grab entries |
| `/api/grab` | POST | Create grab entry |
| `/api/payments` | GET | List payments |
| `/api/auth/[...all]` | * | Better Auth handler (catch-all) |

## Database Schema

```
User ──1:N── Account
User ──1:N── Session
Debt ──1:N── PaymentCalendar
Debt ──M:N── MonthlyDashboard (via implicit relation)
GrabEntry (standalone)
MonthlyDashboard (standalone, with month unique)
Subscription (standalone)
```

## Security Model

- **Authentication:** Better Auth with email/password, Prisma adapter, SQLite/D1
- **Session:** 7-day expiry, 1-day update age, cookie-prefixed "dana"
- **CSRF:** Enabled with origin check
- **Rate limiting:** 10 requests per 60-second window (Better Auth built-in)
- **Route protection:** All API routes use `requireAuthTuple()` — returns 401 on invalid session
- **No CORS configuration needed** (same-origin Next.js app)

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│         Cloudflare Workers              │
│  ┌───────────────────────────────────┐  │
│  │  opennextjs-cloudflare bundle     │  │
│  │  (Next.js compiled to worker)     │  │
│  └────────────┬──────────────────────┘  │
│               │                          │
│  ┌────────────▼──────────────────────┐  │
│  │  Cloudflare D1 (SQLite-compat)    │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```
