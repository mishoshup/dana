# Build Error Fix: DebtSummary.id

## Problem
`./src/app/(main)/page.tsx:199:26` — Type error: Property `id` does not exist on type `DebtSummary`. The `key={d.id}` in the JSX used a field that the `DebtSummary` interface (and the API mapping) didn't include.

## Root Cause
The dashboard API (`src/app/api/dashboard/route.ts`) mapped Prisma `Debt` records to a shape that omitted `id`, and the `DebtSummary` interface in `page.tsx` didn't declare it either — even though the Prisma `Debt` model **does** have an `id` field (`String @id @default(cuid())`).

## Fix Applied
Two files changed:

### `src/app/api/dashboard/route.ts`
Added `id: d.id` to the `debts` mapping so the API returns the debt ID.

### `src/app/(main)/page.tsx`
Added `id: string;` to the `DebtSummary` interface so the type matches the API response and the JSX `key={d.id}` compiles.

## Verification
`npx tsc --noEmit` exits cleanly — no type errors.

## References
- `DebtSummary` is defined once in `src/app/(main)/page.tsx` (line 25) and used nowhere else.
- No other files reference `DebtSummary`.
