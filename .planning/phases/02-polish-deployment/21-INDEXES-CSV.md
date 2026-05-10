# 21 — DB Indexes & CSV Data Export

## DB Indexes

Added indexes to `prisma/schema.prisma`:
- `Debt @@index([status])` — speeds up filtering active/paid/frozen debts
- `PaymentCalendar @@index([status, dueDate])` — composite index for filtering by status + sorting by due date
- `GrabEntry @@index([date])` — speeds up date-range queries

Migration: `20260510041935_add_indexes` applied successfully.

## CSV Data Export

Created `src/app/api/export/route.ts` — a GET endpoint:
- `GET /api/export?type=debts` → `debts.csv`
- `GET /api/export?type=payments` → `payments.csv`
- `GET /api/export?type=grab` → `grab.csv`

Each returns proper `Content-Type: text/csv` and `Content-Disposition: attachment` headers.
Uses `requireAuthTuple()` for auth, same pattern as other API routes.

## Export Buttons

Added small "Export CSV" outline buttons to:
- **Debt page** (`src/app/(main)/debt/page.tsx`) — next to page title
- **Grab page** (`src/app/(main)/grab/page.tsx`) — next to "Log Ride" button
- **Payments page** (`src/app/(main)/payments/page.tsx`) — next to pending total

Buttons use `<a>` tags pointing directly to the export endpoint, styled as border-only outline buttons with a Download icon.
