# Console Error Fixes — Debt Page

## Fix Applied: `<button>` inside `<button>` Hydration Error

**File:** `src/app/(main)/debt/page.tsx`

**Issue:** The `<DialogTrigger>` component (from `@base-ui/react`) renders a native `<button>` element by default. It was wrapping a `<Button>` component, which also renders as a `<button>`. This created the nested `<button><button>...</button></button>` DOM structure, triggering a React hydration error.

**Fix:** Used the `render` prop pattern (already used in `dialog.tsx` for `DialogPrimitive.Close`) to make `Button` the host element of `DialogTrigger`. This passes trigger behavior directly into the Button, eliminating the outer wrapper `<button>`.

**Before:**
```tsx
<DialogTrigger className="flex-1">
  <Button size="sm" disabled={...} className="w-full ...">
    <CreditCard /> Log Payment
  </Button>
</DialogTrigger>
```

**After:**
```tsx
<DialogTrigger
  render={
    <Button size="sm" disabled={...} className="flex-1 w-full ...">
      <CreditCard /> Log Payment
    </Button>
  }
/>
```

## Second Error: Not definitively identified from static analysis

### Possible candidates investigated:

| Candidate | Status |
|-----------|--------|
| Another button-in-button elsewhere | ❌ No other `<DialogTrigger>` usage in codebase |
| `new Date()` SSR/CSR mismatch in `projectClearance()` | ❌ Data loaded after hydration via `useEffect` — no mismatch |
| `icon-192.png` 404 | ⚠️ Network 404, not a React error |
| Dialog content close button using `render={<Button />}` | ✅ Correct pattern in @base-ui |
| Missing `<form>` control | ✅ No forms on page |
| `<p>` containing `<div>` | ✅ Not present |
| Missing `key` props in maps | ✅ All present |
| React state update on unmounted component in `fetchDebts()` | ⚠️ Possible minor warning, no cleanup in useEffect |

### Likeliest candidates for second error:
1. **Cascading error from the button-in-button hydration failure** — React sometimes emits a second related error during hydration recovery.
2. **`new Date()` in `paidThisMonth` computation** — Only fires when debts are populated, which is after hydration, but worth checking in the actual browser console.
3. **A separate console warning only visible with authenticated data** — Some errors may only appear when the debt page renders with actual user data.

**Recommendation:** Open the browser console while signed in and viewing the debt page. The second error should be visible there. If it's related to the button-in-button cascade, it should resolve automatically with this fix. If it's a separate issue, please share the error text and I can address it.

## Build Verification
- `npx next build` passes with no errors
- No TypeScript errors
- No compilation warnings beyond existing deprecation notices

## Related Files
- `src/app/(main)/debt/page.tsx` — Fixed
- `src/components/ui/dialog.tsx` — Pattern reference (no change needed)
