# Auth Layout Fix — Remove Sidebar from Login/Register

## Problem

Auth pages (login, register) were showing the sidebar/nav because `src/app/layout.tsx` wraps all routes in `<Shell>{children}</Shell>`.

## Fix

Created `src/app/(auth)/layout.tsx` — a bare layout for the `(auth)` route group:

```tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

Next.js route group precedence means `(auth)/layout.tsx` overrides the root layout's `Shell` wrapper for all routes under `/(auth)/`. Both `/login` and `/register` now render without the sidebar.

## Verification

- **`src/app/(auth)/login/page.tsx`** — async server component, full-screen centered form. ✅ Compatible.
- **`src/app/(auth)/register/page.tsx`** — async server component, full-screen centered form. ✅ Compatible.
- **`src/app/layout.tsx`** — root layout stays unchanged; Shell still wraps all non-auth routes. ✅

## Files changed

| Action | File |
|--------|------|
| Created | `src/app/(auth)/layout.tsx` |
