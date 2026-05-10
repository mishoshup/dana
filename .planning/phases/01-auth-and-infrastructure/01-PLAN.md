# Phase 1 Plan: Auth & Infrastructure

## Tasks

1. **Fix Account model schema**
   - Change `type String` to `type String @default("email")` in the Account model
   - This fixes Better Auth 1.2.0 credential account creation

2. **Apply schema changes**
   - Run `prisma db push` to update the database schema
   - Clear existing user data for a fresh start

3. **Restart dev server**
   - Kill any running `next dev` processes
   - Start fresh dev server

4. **Create account**
   - Use the email-based signup endpoint
   - Create Danial's account with proper credentials

5. **Organize project files**
   - Move SETUP-COMPLETE.md into the phase directory
   - Clean up any remaining .md files from project root
   - Create structured phase documentation (CONTEXT, PLAN, SUMMARY, FIXES)
