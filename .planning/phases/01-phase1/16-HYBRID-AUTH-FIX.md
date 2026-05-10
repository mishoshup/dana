# Phase 1.16 — Hybrid Auth Architecture (Login & Register)

## What Changed

Converted login and register pages from pure client components to a **hybrid architecture** (server page + client form).

## Files Created

| File | Type | Purpose |
|------|------|---------|
| `src/app/(auth)/login/login-form.tsx` | Client | Form UI + interactivity (useState, handleSubmit, loading/error) |
| `src/app/(auth)/register/register-form.tsx` | Client | Form UI + interactivity |

## Files Updated

| File | Change |
|------|--------|
| `src/app/(auth)/login/page.tsx` | Rewritten as async server component — checks session on the server, redirects if logged in, renders `<LoginForm />` |
| `src/app/(auth)/register/page.tsx` | Same pattern — server checks session, redirects, renders `<RegisterForm />` |

## What Was Removed

- `"use client"` directive from both `page.tsx` files
- `useEffect` cookie checks (`document.cookie.includes("dana.session_token")`)
- `useRouter` imports (no longer needed in page files)
- Flash-of-logged-in-form issue: users no longer briefly see the login form before `useEffect` redirect fires

## Architecture

```
Server Page (async, session check)
  └─ Client Form ("use client", pure form logic)
       ├─ useState for form state
       ├─ handleSubmit → fetch API
       ├─ loading spinner + error display
       └─ window.location.href on success (full reload ensures cookie)
```

## Notes

- Login form uses `window.location.href = "/"` on success (preserves original full-reload approach for cookie processing)
- Register form also uses `window.location.href = "/"` (was `router.push("/")` — changed to full reload for consistency)
- Both forms keep `credentials: "include"` on the fetch call to ensure cookies are sent/received
