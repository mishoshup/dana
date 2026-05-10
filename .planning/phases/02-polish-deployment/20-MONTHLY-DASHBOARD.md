# Monthly Dashboard — Implementation Summary

**Fixer:** Pantheon Fixer  
**Date:** 2026-05-10  
**Status:** ✅ Complete

---

## What Was Built

### 1. New API Route: `src/app/api/dashboard/route.ts`

**`GET /api/dashboard?month=5&year=2026`** — Single endpoint that returns all data needed for the dashboard view.

**Response shape:**
```json
{
  "salary": 3000,
  "grabIncome": 1200.50,
  "freelanceIncome": 0,
  "totalIncome": 4200.50,
  "debtPayments": 874,
  "subscriptions": 258.40,
  "estimatedCosts": 850,
  "totalExpenses": 1982.40,
  "surplus": 2218.10,
  "grabsThisMonth": 15,
  "debts": [
    {
      "type": "SPayLater",
      "balance": 3500,
      "monthlyPayment": 200,
      "paid": 200,
      "endDate": "2027-06-01"
    }
  ],
  "upcomingPayments": [
    {
      "id": "clx...",
      "amount": 200,
      "dueDate": "2026-05-15T00:00:00.000Z",
      "status": "pending",
      "debt": { "type": "SPayLater" }
    }
  ]
}
```

**Data sources:**
| Field | Source | Notes |
|-------|--------|-------|
| `salary`, `freelanceIncome` | `MonthlyDashboard` table | Per-month config; defaults to 0 |
| `grabIncome` | `GrabEntry` aggregate | Sum of `net` (or `gross` if null) for the month |
| `grabsThisMonth` | `GrabEntry` count | Entries in the month |
| `debtPayments` | `PaymentCalendar` sum | Sum of all `amount` due in the month |
| `subscriptions` | `Subscription` sum | Sum of `cost` where `active=true` |
| `estimatedCosts` | `MonthlyDashboard` | `food + fuelTolls + grabCosts`; falls back to 850 |
| `debts[]` | `Debt` table | Active debts with this month's paid total |
| `upcomingPayments[]` | `PaymentCalendar` | Pending payments in the month (next 5) |

**Patterns followed:**
- `requireAuthTuple()` for auth (same as other routes)
- Zod validation for query params (`z.coerce.number()`)
- Standard try/catch with `PrismaClientKnownRequestError` handling
- Uses `prisma` from `@/lib/db`

### 2. Updated Dashboard Page: `src/app/(main)/page.tsx`

**Before:** Three separate fetches to `/api/debt`, `/api/payments`, `/api/grab` with hardcoded values:
- `maySalary = 3000` (hardcoded)
- `estimatedCosts = 450 + 300 + 100 = 850` (hardcoded)
- Debt progress computed from local `payments` data

**After:** Single fetch to `/api/dashboard?month=N&year=YYYY` with real data:
- Income = real salary (from DB) + real grab income (from DB)
- Surplus = real income − real expenses
- Debt progress = cumulative `paid` (from this month's PaymentCalendar)
- Month label is dynamic (no more hardcoded "May 2026")

**New section:** "Monthly Expenses" breakdown card showing:
- Debt Payments (from DB)
- Subscriptions (from DB)
- Estimated Costs (from MonthlyDashboard or default)
- Total Expenses
- Surplus

**UI preserved:** Same cards, color maps, progress bars, upcoming payments list, quick action buttons.

### 3. Prisma Schema

No schema changes needed. The existing `MonthlyDashboard` model already has all required fields:
- `salary`, `freelanceIncome`, `food`, `fuelTolls`, `grabCosts`
- `month` (unique DateTime — first day of month)

---

## What This Enables

1. **Real dashboard data** — No more hardcoded RM3000 salary or RM850 estimates
2. **Monthly salary configuration** — User can set salary per month via the MonthlyDashboard table (need a UI for this in future)
3. **Single API call** — `/api/dashboard` replaces 3 separate fetches, reducing client-side complexity
4. **Scalable for future** — Easy to add more fields to the dashboard response without changing the page

---

## Next Steps / TODOs

- [ ] Create a Monthly Dashboard settings page/UI where user can set salary, freelance income, and estimated costs per month
- [ ] Consider caching the dashboard API response (it's read-heavy)
- [ ] Add a `POST /api/dashboard` route to upsert MonthlyDashboard entries
