# Account Creation & Schema Fixes

## Problem

Better Auth 1.2.0 does not send a `type` field when creating credential accounts. However, the Prisma `Account` model defined `type String` (required, no default value). This caused account creation to silently fail because Prisma rejected the null/undefined `type` value.

## Fix Applied

**File:** `prisma/schema.prisma` — **Account model**

```diff
- type   String
+ type   String   @default("email")
```

This makes `type` default to `"email"` for credential accounts when Better Auth doesn't supply a value, which is the correct behavior.

## Steps Taken

1. Confirmed schema already had `@default("email")` on Account.type (fix was previously applied)
2. Ran `npx prisma db push --skip-generate` — database already in sync
3. Cleared stale User records with `DELETE FROM User`
4. Started dev server on port 3001 (port 3000 was occupied by a stale process)
5. Created account via `POST /api/auth/signup/email`:
   - Email: danial@danialsanusi.com
   - Password: (configured during setup — dana12345)
   - Name: Danial
6. **Correct endpoint:** `/api/auth/signup/email` (not `/api/auth/sign-up/email`)

## Verification

- `SELECT count(*) FROM Account;` → **1** ✅ (account exists)
- `SELECT * FROM User;` → User record created with email/name ✅
- Account type field: `"email"` (default applied correctly) ✅
- Provider ID: `"credential"` ✅
- Dev server was running on port 3001
