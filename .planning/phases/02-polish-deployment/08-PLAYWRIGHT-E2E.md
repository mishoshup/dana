# ✅ Playwright E2E Testing — Setup Complete

## Summary

Playwright has been set up for end-to-end testing of the Dana Personal Finance OS.

## Files Created

### `e2e/playwright.config.ts`
- Base URL: `http://localhost:3000`
- Project: chromium only (Desktop Chrome)
- Web server config commented out (manual dev server start)
- Timeout: 30s, trace on first retry, screenshot on failure

### `e2e/helpers.ts`
- **`uniqueEmail()`** — generates unique test emails
- **`registerUser(page, email, password, name)`** — registers via `/api/auth/sign-up/email` and injects session cookies into the browser context
- **`loginUser(page, email, password)`** — logs in via `/api/auth/sign-in/email` and injects session cookies
- **`createDebt(page, data)`** — creates a debt via POST `/api/debt` with auth cookies from the page context
- Includes a `parseSetCookie()` utility for extracting cookies from Set-Cookie headers

### `e2e/auth.spec.ts`
- Register page loads without sidebar
- Register and redirect to home
- Login via form and redirect to home
- Protected page redirects to `/login` when unauthenticated
- API returns 401 when unauthenticated

### `e2e/debt.spec.ts`
- Create debt via API → verify on dashboard
- Create debt via API → verify on debt tracker page
- Delete debt via API → verify success
- List debts via API

### `e2e/grab.spec.ts`
- Log ride entry via API → verify stats on page
- Log ride via form UI → submit
- Rejects invalid grab entry (missing required fields)

## Files Modified

### `package.json`
Added scripts:
- `test:e2e` — runs Playwright tests headlessly
- `test:e2e:ui` — runs Playwright in UI mode

### `.gitignore`
Added `test-results/` directory

## Dependencies Installed
- `@playwright/test` v1.59.1 (devDependency)
- Chromium browser (v147) via `playwright install chromium`

## How to Run

1. Start the dev server:
   ```bash
   pnpm dev
   ```

2. In another terminal, run tests:
   ```bash
   pnpm test:e2e
   ```

   Or for interactive UI mode:
   ```bash
   pnpm test:e2e:ui
   ```

### Notes
- Tests use `test.beforeEach` with unique emails for isolation
- Auth state is managed via cookie injection from API responses (better-auth cookies with `dana` prefix)
- Tests are independent and can run in parallel
- The dev server must be running before executing tests (auto-start config is commented out in playwright.config.ts)
