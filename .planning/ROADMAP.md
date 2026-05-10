# Dana — Project Roadmap

## Project Goal
A personal finance operating system — track debts, income, subscriptions, and monthly budgets in one place.

---

## Shipped

### Phase 1 — Foundation + MVP
**Goal:** Authentication, core data models, debt/grab/payments/subscriptions pages, dark shell.
**Status:** completed

---

## In Progress

### Phase 2 — Polish & Deployment
**Goal:** D1 deployment, email verification, password reset, error boundaries, loading states.
**Depends on:** Phase 1
**Status:** planned

### Phase 3 — Monthly Dashboard
**Goal:** Full monthly overview with salary input, income/expense breakdown, surplus tracking.
**Depends on:** Phase 2
**Status:** discussed

---

## Upcoming

### Phase 4 — Settings & Profile
**Goal:** User settings, profile management, currency, theme toggle.
**Depends on:** Phase 3
**Status:** backlog

### Phase 5 — Data Export & Backup
**Goal:** CSV/JSON export, backup/restore, maybe auto-backup to Cloudflare R2.
**Depends on:** Phase 4
**Status:** backlog

### Phase 6 — Mobile Apps
**Goal:** PWA or minimal native wrapper for quick-entry (especially Grab).
**Depends on:** Phase 5
**Status:** backlog

---

## Backlog

| # | Item | Goal |
|---|------|------|
| 999.1 | Email verification | Send verification email, block unverified logins |
| 999.2 | Password reset | Reset token flow, email link |
| 999.3 | Cloudflare D1 deployment | Swap SQLite for D1, test staging |
| 999.4 | Error boundaries | Per-page and global error UI |
| 999.5 | Monthly dashboard | Salary + all income/expense in one view |
| 999.6 | Settings page | Profile edit, password change, preferences |
| 999.7 | Data export | CSV for debts, grab, payments |
| 999.8 | Budget goals | Set monthly savings target, track progress |
| 999.9 | Grab cost breakdown | Fuel/tolls/commission breakdown per period |
| 999.10 | Dark/light toggle | System preference aware |
