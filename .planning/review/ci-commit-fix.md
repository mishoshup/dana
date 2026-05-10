# CI Commit Fix Summary

## What was done

Found uncommitted changes in the repo that contained the fix for the CI build failure (`Export auth doesn't exist in target module`). Committed and pushed them.

## Changes committed

| File | Change |
|------|--------|
| `src/app/(auth)/login/page.tsx` | `import { auth }` → `import { getAuth }`, added `const auth = await getAuth()` |
| `src/app/(auth)/register/page.tsx` | Same pattern |
| `src/app/(main)/settings/page.tsx` | Same pattern |
| `src/app/(main)/debt/page.tsx` | Fixed DialogTrigger to use `render` prop instead of wrapping children |
| `src/app/(main)/page.tsx` | Added `id: string` to DebtSummary, changed key from `d.type` to `d.id` |

## CI Status

| Run ID | Status | Event |
|--------|--------|-------|
| `25624067529` | **in_progress** | push (this fix) |
| `25623826097` | completed (failure) | previous CI run |
| `25623373235` | completed (failure) | earlier CI run |

The fix commit `432640d` successfully triggered a new CI workflow that is currently running.
