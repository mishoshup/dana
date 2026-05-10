# 🔐 Security & Secret Audit Report

**Date:** 2026-05-10
**Scope:** Dana Personal Finance OS — all committed git files
**Method:** git grep, file inspection, SQLite examination, .gitignore validation

---

## Executive Summary

**Risk Level: MEDIUM-HIGH** — One critical finding (committed SQLite dev database), no leaked production secrets.

---

## Finding 1: 🔴 CRITICAL — `prisma/dev.db` committed to git

| Attribute | Value |
|-----------|-------|
| **File** | `prisma/dev.db` (188 KB, SQLite 3.x) |
| **Since** | Initial commit `9f398c9` |
| **What's inside** | See below |

This SQLite database was created by the initial scaffold and has been tracked in every commit. It contains **real test/development data**:

### Exposed User Data

- **~76 user records** with emails, hashed passwords, timestamps
- **Account records** with password hashes (scrypt/salted hash format, e.g. `salt:hash`)
- **96 session tokens** (some may still be valid if session wasn't rotated)
- **Verification tokens** (0 records currently, but schema exists)

### Real emails exposed:
- `danial@danialsanusi.com` — your actual login email
- `admin@example.com` — dev admin account
- `test2@test.com` — another real-ish account
- ~70 test accounts (`test-*@example.com`)

### Exposed Financial Data

- **38 debt records** with types (SPayLater, Car Loan), balances (RM5,000–RM30,000), statuses
- **12 Grab earnings entries** with hours, gross pay, net pay
- **3 subscription/payment records** with amounts
- Schema for MonthlyDashboard (salary, income breakdowns) exists

### Password Hashes

The `Account` table stores password hashes in `salt:hash` format. These are scrypt-hashed (Better Auth's default), not plaintext. However:
- If your dev password is weak, it could be cracked
- If you use the same password elsewhere, that's a credential reuse risk

### Session Tokens

96 session tokens stored — if any are still unexpired, they could theoretically be used to authenticate.

---

## Finding 2: 🟡 MEDIUM — Dev auth secret committed to .env (but .env is gitignored)

| Attribute | Value |
|-----------|-------|
| **File** | `.env` (local only, properly gitignored) |
| **Value** | `BETTER_AUTH_SECRET="dana-dev-secret-change-in-production"` |

The `.env` file is NOT tracked in git ✅. The dev secret `dana-dev-secret-change-in-production` is a development placeholder that was flagged in the previous Phase 1 enterprise review.

**Risk:** Only local. This is a well-known dev placeholder that must not be used in production.

---

## Finding 3: 🟢 LOW — Planning docs contain email address

Files like `01-FIXES.md`, `01-SUMMARY.md`, and `SETUP-COMPLETE.md` reference `danial@danialsanusi.com`.

**Risk:** Minimal. This email is used as the dev user's login for the app. If this repo is public, the email is exposed. Currently the repo appears to be private.

---

## Finding 4: ✅ CLEAN — `.env.example` has no secrets

`.env.example` correctly uses empty/placeholder values:
- `DATABASE_URL="file:./prisma/dev.db"` — local path, safe
- `BETTER_AUTH_URL=http://localhost:3000` — dev URL, safe
- `BETTER_AUTH_SECRET=` — empty, safe
- `NEXTJS_ENV=development` — safe

---

## Finding 5: ✅ CLEAN — `.gitignore` properly excludes env files

```
.env*
.dev.vars*
```

Confirmed working:
- `git check-ignore .env .env.local .env.production` → all ignored ✅
- `git ls-files .env*` → empty ✅
- No `.env.*` files tracked ✅

---

## Finding 6: ✅ CLEAN — No committed `.env` files

`git ls-files .env .env.local .env.production .env.development` → all empty ✅

---

## Finding 7: ✅ CLEAN — Wrangler config has no secrets

`wrangler.jsonc` contains:
- D1 `database_id` — this is a **database instance identifier**, not a credential. Cloudflare D1 uses Wrangler API tokens for auth, not the database ID alone. Low sensitivity.
- R2 bucket name — identifier only
- No API keys, tokens, or secrets

---

## Finding 8: ✅ CLEAN — Source code uses env vars properly

- `src/lib/auth.ts` reads `BETTER_AUTH_SECRET` from `process.env` — no hardcoded secrets ✅
- No API keys or tokens in source code ✅

---

## Summary Table

| # | Finding | Severity | Status | Already Fixed? |
|---|---------|----------|--------|----------------|
| 1 | `prisma/dev.db` committed with user records, password hashes, session tokens, financial data | 🔴 CRITICAL | **Still active** | ❌ Not fixed |
| 2 | Dev auth secret placeholder in local .env | 🟡 MEDIUM | Already known | N/A (local only) |
| 3 | Email address in planning docs | 🟢 LOW | Still present | Tolerable for private repo |
| 4 | .env.example has no real secrets | ✅ CLEAN | — | — |
| 5 | .gitignore properly configured | ✅ CLEAN | — | ✅ |
| 6 | No .env files committed | ✅ CLEAN | — | ✅ |
| 7 | wrangler.jsonc has no secrets | ✅ CLEAN | — | ✅ |
| 8 | Source code uses env vars | ✅ CLEAN | — | ✅ |

---

## Recommended Immediate Actions

### 🔴 Must fix (Finding 1)

1. **Add `prisma/dev.db` to `.gitignore`:**
   ```
   # local databases
   prisma/dev.db
   prisma/*.db
   ```

2. **Remove `prisma/dev.db` from git tracking:**
   ```bash
   git rm --cached prisma/dev.db
   ```

3. **Rotate any passwords used in dev:**
   - If you used the same password for `danial@danialsanusi.com` in dev and anywhere else, change it
   - The password hash is in the committed DB

4. **Invalidate all dev sessions** (restart server or rotate `BETTER_AUTH_SECRET` in dev)

5. **Regenerate a new dev secret** (optional but good practice):
   ```bash
   openssl rand -base64 32
   ```

### 🟡 Should fix (Finding 2)

- Generate a proper dev secret (same as step 5 above) instead of using the placeholder

### 🟢 Consider (Finding 3)

- If the repo might ever become public, scrub `.planning/` files of the real email

---

## Residual Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Password hash cracking (dev data) | Low (weak dev pwd needed) | Medium (credential reuse) | Remove db from git + rotate pwd |
| Session token reuse (dev) | Low (tokens expire 7d) | Medium (access to dev data) | Already being removed |
| Financial data exposure (dev) | Low (repo is private) | Low-Medium (test data only) | Remove db from git |
| Prod secret leak | Very Low | Critical | Env vars properly isolated |

**Mitigation depends on who has access to the git repo.** If the repo is private and only you access it, the main risk is if the repo becomes public or is shared.

---

*Report generated by Pantheon Security Agent*
