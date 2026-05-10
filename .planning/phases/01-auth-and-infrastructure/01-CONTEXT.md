# Phase 1: Auth & Infrastructure

## Background

The initial audit of the Dana project found **27 issues** across the codebase. This phase focuses on fixing the most critical ones: authentication, infrastructure setup, and data plumbing.

## Scope

- Fix auth middleware and configuration
- Fix account creation (Account model schema)
- Fix schema violations and data plumbing
- Ensure the app can start and users can sign up

## Issues Addressed (from audit)

- Root cause: Better Auth 1.2.0 doesn't send `type` when creating credential accounts, but the Account model had `type` as required (non-nullable, no default)
- Schema fix: Added `@default("email")` on Account.type (already applied in schema)
- Endpoint: Better Auth signup is at `POST /api/auth/signup/email` (not `sign-up`)
- Dev server needed restart + DB clear for clean account creation
- Auth middleware configured properly with email/password enabled
- Project root was cluttered with setup files instead of organized in phases
