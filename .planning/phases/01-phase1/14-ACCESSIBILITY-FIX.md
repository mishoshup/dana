# Accessibility Fixes — Phase 1

**Date:** 2026-05-10  
**Agent:** Pantheon Fixer (accessibility)

## Summary

Applied 5 accessibility improvements across 3 files.

## Changes Made

### 1. HIGH: Mobile menu button — `aria-label`
- **File:** `src/components/shell.tsx`
- Added `aria-label="Open navigation menu"` to the hamburger button that triggers the mobile sidebar.

### 2. HIGH: `aria-current="page"` on active nav links
- **File:** `src/components/shell.tsx`
- Sidebar nav items (around line 83): added `aria-current={active ? "page" : undefined}`
- Bottom nav items (around line 148): added `aria-current={active ? "page" : undefined}`
- Screen readers now announce "current page" for the active navigation link.

### 3. MEDIUM: Skip-to-content link
- **File:** `src/app/layout.tsx` (root layout)
- Added a visually hidden skip link as the first child of `<body>`:
  ```tsx
  <a href="#main-content" className="sr-only focus:not-sr-only ...">
    Skip to content
  </a>
  ```
- **File:** `src/components/shell.tsx`
- Added `id="main-content"` to the `<main>` wrapper, providing the skip target.
- Keyboard users can now skip the sidebar navigation.

### 4. MEDIUM: Close button — `aria-label`
- **File:** `src/components/shell.tsx`
- Added `aria-label="Close menu"` to the X button in the mobile sidebar header.

### 5. LOW: Platform select — `aria-label`
- **File:** `src/app/(main)/grab/page.tsx`
- Added `aria-label="Platform"` to the native `<select>` element in the Grab entry form.

## Not Modified

- **`src/app/(auth)/login/page.tsx`** and **`src/app/(auth)/register/page.tsx`** — all form inputs already have associated `<label htmlFor>` elements, so no additional `aria-label` attributes are needed.
- **`src/app/(main)/layout.tsx`** — this layout simply wraps children in `<Shell>`; the skip link belongs in the root layout (which has `<body>`) and the `#main-content` target is in Shell.

## Build Check

Run `npm run build` or `next build` in the project root to verify no compilation errors.
