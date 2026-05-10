# React Key Fix — Duplicate Key Error

## Problem
Console error: "Encountered two children with the same key, SPayLater"

Multiple debts can share the same `type` (e.g., "SPayLater"), causing duplicate React keys when `key={d.type}` is used in a map.

## Fix Applied
**File:** `src/app/(main)/page.tsx` — line 199

Changed `key={d.type}` → `key={d.id}` on the `<div>` inside `activeDebts.map(...)`.

## Scan Results
✅ Searched all `src/app/` for `key={.*\.type}` patterns — **0 occurrences remaining** (only the one fixed existed).

## Verification
- `grep -rn "key={.*\.type" src/app/ --include="*.tsx"` returns empty (no matches).
- The `d.id` field is unique per debt entry, so React keys are now guaranteed unique.
