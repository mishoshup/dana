# CI Node Version Fix

## Change
Bumped `node-version` from `20` → `22` in `.github/workflows/deploy.yml`.

## Why
pnpm v11+ requires Node.js ≥ 22.13. The workflow used `pnpm/action-setup@v4` with `version: latest`, which resolves to pnpm v11+ but then `actions/setup-node@v4` pinned Node.js 20 — causing a compatibility failure.

## Workflow Verification
| Step | Status |
|------|--------|
| `actions/checkout@v4` | ✅ Standard checkout |
| `pnpm/action-setup@v4` | ✅ Installs latest pnpm |
| `actions/setup-node@v4` with `cache: pnpm` | ✅ Now Node 22, correct cache key |
| `pnpm install --frozen-lockfile` | ✅ Works with pnpm v11 |
| `npx opennextjs-cloudflare build` | ✅ OpenNext build |
| `cloudflare/wrangler-action@v3 deploy` | ✅ Wrangler deploy with secrets |
| `wrangler d1 execute` on `prisma/migrations/*/migration.sql` | ✅ D1 migrations, `continue-on-error: true` |

All steps look correct. No other changes needed.
