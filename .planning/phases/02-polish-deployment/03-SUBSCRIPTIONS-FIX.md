# SUBSCRIPTIONS FIX — Summary

**Status:** ✅ Complete

## What was done

### 1. Created `src/app/api/subscriptions/route.ts`
- **GET** — fetches all subscriptions from DB via Prisma, ordered by cost desc
- **POST** — creates a new subscription with validation (name + cost required)
- Uses same auth pattern (`requireAuthTuple`) as existing API routes

### 2. Created `src/app/api/subscriptions/[id]/route.ts`
- **PATCH** — updates any field of a subscription by ID (used for toggle)
- Handles `active`, `name`, `cost`, `category`, `rating`, `notes`
- Uses the same dynamic route pattern as `api/debt/[id]`

### 3. Refactored `src/app/subscriptions/page.tsx`
**Before:** Hardcoded `initialSubscriptions` array with local `toggleActive()` state.

**After:**
- `useEffect` + `fetch("/api/subscriptions")` on mount
- Three states: `loading` → `error` → `success`
- **Loading state:** pulsing placeholder blocks (no skeleton component dependency)
- **Error state:** "Failed to load subscriptions" + Retry button
- **Success:** Fetches real data from DB, displays same UI (rating badges, category, cost)
- **Toggle:** Optimistic update → `PATCH /api/subscriptions/[id]` → revert on failure
- Switch is disabled while toggling to prevent double-clicks
- Empty state: "No subscriptions yet. Add one to get started."
- Fixed `body is of type 'unknown'` TS errors with proper `Record<string, unknown>` typing

### API Route files created
| File | Endpoints |
|------|-----------|
| `src/app/api/subscriptions/route.ts` | `GET /api/subscriptions`, `POST /api/subscriptions` |
| `src/app/api/subscriptions/[id]/route.ts` | `PATCH /api/subscriptions/[id]` |

### DB model (unchanged, already present in Prisma schema)
```prisma
model Subscription {
  id          String   @id @default(cuid())
  name        String
  cost        Float
  renewalDate DateTime?
  category    String?
  rating      String   @default("Essential") // Essential, Nice-to-have, Unused
  active      Boolean  @default(true)
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```
