# Phase 1.13 — Zod Schema Validation (Enterprise Grade)

## Summary

Replaced all manual field-level validation in API routes with centralized Zod schemas. This provides type-safe, declarative validation with field-level error messages.

## What Was Done

### 1. Installed Zod v4.4.3
```bash
pnpm add zod
```

### 2. Created `src/lib/validation.ts`
Shared Zod schemas covering all data types, aligned with the Prisma schema:

| Schema | Entity | Fields Validated |
|--------|--------|-----------------|
| `debtSchema` | POST Debt | type (required, max 50), balance (>=0), monthlyPayment, interestRate, startDate, endDate, status (enum: active/paid/frozen), notes |
| `debtUpdateSchema` | PATCH Debt | Same as above, all optional |
| `paymentSchema` | POST Payment | debtId, dueDate (required), amount (>0), status (enum: pending/paid/late), paidDate, notes |
| `paymentUpdateSchema` | PATCH Payment | id (required), status, paidDate |
| `grabSchema` | POST Grab | date (required), platform (enum: Grab/Bolt/inDrive), hours (0-24), gross (>=0), commission, fuel, tolls, net, notes |
| `subscriptionSchema` | POST Subscription | name (required, max 100), cost (>=0), category, rating (enum: Essential/Nice-to-have/Unused), active, renewalDate, notes |
| `subscriptionUpdateSchema` | PATCH Subscription | Same as above, all optional |

### 3. Created `src/lib/api-helpers.ts`
- `validateBody<T>()` — generic helper wrapping `safeParse` with standard error response
- `validationError()` — quick ZodError to NextResponse converter

### 4. Updated 6 API Route Files

| Route | Method | Schema Used |
|-------|--------|-------------|
| `debt/route.ts` | POST | `debtSchema` |
| `debt/[id]/route.ts` | PATCH | `debtUpdateSchema` |
| `grab/route.ts` | POST | `grabSchema` |
| `payments/route.ts` | POST | `paymentSchema` |
| `payments/route.ts` | PATCH | `paymentUpdateSchema` |
| `subscriptions/route.ts` | POST | `subscriptionSchema` |
| `subscriptions/[id]/route.ts` | PATCH | `subscriptionUpdateSchema` |

### 5. Validation Pattern Applied
Each handler now:
1. Calls `schema.safeParse(body)` instead of manual `if (!body.field)` checks
2. Returns `{ error: "Validation failed", details: { field: ["message"] } }` on failure
3. Uses parsed/coerced typed data instead of raw `body.field`
4. Falls back to existing try/catch for Prisma-level errors

## Error Response Shape (all routes)
```json
{
  "error": "Validation failed",
  "details": {
    "type": ["Type is required"],
    "balance": ["Balance must be >= 0"]
  }
}
```

## Files Modified
- `src/lib/validation.ts` — **NEW** (3 KB)
- `src/lib/api-helpers.ts` — **NEW** (0.8 KB)
- `src/app/api/debt/route.ts` — Updated
- `src/app/api/debt/[id]/route.ts` — Updated
- `src/app/api/grab/route.ts` — Updated
- `src/app/api/payments/route.ts` — Updated
- `src/app/api/subscriptions/route.ts` — Updated
- `src/app/api/subscriptions/[id]/route.ts` — Updated

## Verification
TypeScript compilation (`tsc --noEmit`) passes with zero new errors. All errors are pre-existing in page components (unrelated `unknown` type issues in client-side code).
