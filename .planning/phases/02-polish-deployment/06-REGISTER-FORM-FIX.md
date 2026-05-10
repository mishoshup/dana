# Register Form Fix

## Problem

The register form at `src/app/(auth)/register/page.tsx` used a standard HTML form action:

```html
<form action="/api/auth/sign-up/email" method="POST">
```

When submitted, the browser navigated directly to `/api/auth/sign-up/email`, which returned raw JSON instead of redirecting the user to the dashboard.

## Changes Made

Converted the register page from a **server component** to a **client component** (`"use client"`) with proper fetch-based form handling:

1. **Added `"use client"` directive** — enables client-side interactivity
2. **Controlled form state** — `useState` for `name`, `email`, `password`
3. **`fetch`-based submission** — `POST /api/auth/sign-up/email` with JSON body
4. **Client-side redirect** — `router.push("/")` on success
5. **Inline error display** — error message shown in a red banner above the form, not an `alert()`
6. **Loading state** — submit button shows a spinner + "Creating account..." when loading, and is disabled
7. **Same UI preserved** — dark theme, centered card, Dana branding, all original styling
8. **Error handling** — catches both HTTP errors (non-ok responses) and network exceptions

## Files Changed

| File | Change |
|------|--------|
| `src/app/(auth)/register/page.tsx` | Rewritten as client component with fetch |
| `.planning/phases/02-polish-deployment/06-REGISTER-FORM-FIX.md` | This summary |

## What Was Removed

- `import { auth } from "@/lib/auth"`
- `import { headers } from "next/headers"`
- Server-side session check (`auth.api.getSession` + `redirect("/")`)
  - Session check not needed here; the dashboard and middleware handle redirect for authenticated users

## Note

The **login page** (`login/page.tsx`) uses the same pattern (`action="/api/auth/sign-in/email"`) and has the same issue. If users report the same problem on login, apply the same fix.
