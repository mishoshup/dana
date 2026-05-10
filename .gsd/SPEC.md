# SPEC: Debt Tracker v1

## Goal
Build a fully-featured debt tracker within Dana that aligns with Danial's finance recovery plan. Core value: never miss a payment. Core mechanic: see debt → pay → watch balance drop.

## Scope (In)
- 4 debts: SPayLater, S-Financing I, Car Loan, MARA
- Home screen: total debt, debt-free date countdown, monthly payment status
- Per-debt drill-down: balance, progress bar, monthly payment, clearance date, payoff strategy
- Payment calendar: all due dates sorted by next due, status colors
- Payment logging: enter amount + date → balance updates, bar moves, history logs
- Freedom number: X payments/months until debt-free
- Projection: "Pay RMX extra → clear Y months earlier"
- Snowball view: smallest balance first, shows which to attack
- Payment history log per debt
- Danger zone highlighting for June-July peak

## Scope (Out for v1)
- Grab-to-debt pipeline
- Charts/visualizations
- Multi-user
- Credit score tracking
- Interest calculations

## Architecture
- Integrate into existing Dana Next.js app
- Uses existing Prisma Debt + PaymentCalendar models
- shadcn/ui components with dark mode
- Mobile-first responsive
- API routes for payment logging (Usachi curl-able)

## Acceptance Criteria
1. All 4 debts visible on home screen with balances
2. Tap debt → see full details
3. Log payment → balance updates, bar moves, history records
4. Payment calendar shows all upcoming due dates sorted
5. Freedom number visible on home screen
6. Snowball view shows payoff priority
7. Projection: see impact of extra payments
8. All payments persisted in D1
