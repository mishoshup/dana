# 22-USER-FEATURES.md — Logout + Settings + Password Reset

## Summary

Implemented user-facing auth features: logout button, settings page with profile editing and password change, and a disabled forgot-password placeholder.

## Changes Made

### 1. Logout Button (`src/components/shell.tsx`)
- Added a "Log out" button in the sidebar, placed above the footer area
- Calls `POST /api/auth/sign-out` (handled by better-auth catch-all route)
- Redirects to `/login` on success
- Style: subtle text button matching existing sidebar aesthetic (`text-zinc-500 hover:text-zinc-300`)

### 2. Settings Link (`src/components/shell.tsx`)
- Added `Settings` to lucide-react imports
- Added `{ href: "/settings", label: "Settings", icon: Settings }` to the navItems array
- Automatically appears in both desktop sidebar and mobile bottom nav

### 3. Settings Page
- **`src/app/(main)/settings/page.tsx`** — Server component that checks auth session; redirects to `/login` if unauthenticated
- **`src/app/(main)/settings/settings-form.tsx`** — Client component with two sections:
  - **Profile**: Shows user email (read-only), editable name field. Submits via `POST /api/auth/update-user`
  - **Change Password**: Current + new password fields. Submits via `POST /api/auth/change-password`
  - Both forms show success/error feedback messages
  - Inputs styled consistently with existing forms (zinc-800 bg, rounded borders)

### 4. Forgot Password Placeholder (`src/app/(auth)/login/login-form.tsx`)
- Added a disabled "Forgot password?" link below the password field
- Greyed out (`text-zinc-600 cursor-not-allowed`) with tooltip: "Coming soon — contact admin to reset"
- Sets up UX placeholder for when email service is implemented

## Verification
- All new/changed files pass TypeScript type checking
- Pre-existing TypeScript errors in `register-form.tsx` and `debt/page.tsx` remain unchanged
- better-auth handles the underlying API routes via the existing catch-all at `/api/auth/[...all]/route.ts`
