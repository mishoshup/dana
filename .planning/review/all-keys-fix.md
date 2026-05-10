# Key Props Audit — All `.map()` Calls

**Date:** 2026-05-10
**Task:** Fix all missing key props

## Result: No fixes needed 🔍✅

Every `.map()` call that renders JSX already has a proper `key` prop. Full audit below.

## Dashboard (`page.tsx`)

| Line | Code | Key? |
|------|------|------|
| 191 | `activeDebts.map((d)` | ✅ `key={d.id}` (line 210) |
| 303 | `upcomingPayments.map((p)` | ✅ `key={p.id}` (line 305) |

## Grab (`grab/page.tsx`)

| Line | Code | Key? |
|------|------|------|
| 133 | `dayNames.map((day, idx)` | ✅ Data transform, not JSX |
| 202 | `platforms.map((p)` | ✅ `key={p.name}` |
| 318 | `platforms.map((p)` | ✅ `key={p.name}` |

## Payments (`payments/page.tsx`)

| Line | Code | Key? |
|------|------|------|
| 127 | `.map(([monthKey, monthPayments])` | ✅ `key={monthKey}` |
| 148 | `.map((p)` | ✅ `key={p.id}` |

## Subscriptions (`subscriptions/page.tsx`)

| Line | Code | Key? |
|------|------|------|
| 83 | `prev.map((s)` | ✅ Data transform, not JSX |
| 98 | `prev.map((s)` | ✅ Data transform, not JSX |
| 106 | `prev.map((s)` | ✅ Data transform, not JSX |
| 243 | `subscriptions.map(renderSubItem)` | ✅ `key={sub.id}` inside renderSubItem |

## Debt (`debt/page.tsx`)

| Line | Code | Key? |
|------|------|------|
| 287 | `displayDebts.map((debt)` | ✅ `key={debt.id}` |
| 446 | `debt.payments.slice(0,3).map((p)` | ✅ `key={p.id}` |

## Shell (`components/shell.tsx`)

| Line | Code | Key? |
|------|------|------|
| 60 | `navItems.map((item)` | ✅ `key={item.href}` |
| 109 | `navItems.map((item)` | ✅ `key={item.href}` |

## API Routes (no JSX rendering, data transforms only)

| File | Lines | Key? |
|------|-------|------|
| `api/dashboard/route.ts` | 115, 127 | ✅ N/A (data only) |
| `api/export/route.ts` | 8, 48, 79, 111 | ✅ N/A (data only) |

## Conclusion

**0 files needed changes.** All key warnings in the dashboard were already resolved by a previous fix.
