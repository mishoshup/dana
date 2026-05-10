# Layout Restructure — Shell No Longer Wraps Auth Pages

## Problem
Root `src/app/layout.tsx` wrapped everything in `<Shell>`, including auth pages (`/login`, `/register`). The `shell.tsx` component had a brittle workaround (`if (pathname === "/login")`) that only partially fixed it and didn't cover `/register`.

## Fix
Restructured with Next.js App Router route groups:

### Before
```
src/app/
  layout.tsx → <Shell>{children}</Shell>
  (auth)/
    layout.tsx → {children} (but Shell still wraps from root)
    login/
    register/
  page.tsx (dashboard)
  debt/
  grab/
  payments/
  subscriptions/
```

### After
```
src/app/
  layout.tsx → minimal (html, body, globals.css only)
  (auth)/
    layout.tsx → {children} (no Shell)
    login/
    register/
  (main)/
    layout.tsx → <Shell>{children}</Shell>
    page.tsx (dashboard)
    debt/
    grab/
    payments/
    subscriptions/
  api/ → stays at root (not page routes)
```

## Changes Made

1. **`src/app/layout.tsx`** — Removed `<Shell>` wrapper and its import. Root layout is now minimal (html/body + globals.css only).

2. **`src/app/(main)/layout.tsx`** (created) — New route group layout that wraps children with `<Shell>`. Only pages in `(main)` get the shell.

3. **Moved into `(main)/`**:
   - `page.tsx` (dashboard)
   - `debt/`
   - `grab/`
   - `payments/`
   - `subscriptions/`

4. **Preserved as-is**:
   - `(auth)/` — bare layout, no Shell
   - `api/` — stays at root (API routes don't need Shell)
   - `favicon.ico`, `globals.css`

## Verification

Server starts cleanly with no compilation errors:
- `/` (Dashboard) → 200 ✓
- `/login` → 200 ✓
- `/register` → 200 ✓
- `/debt`, `/grab`, `/payments`, `/subscriptions` → 307 (auth middleware redirect, expected)
