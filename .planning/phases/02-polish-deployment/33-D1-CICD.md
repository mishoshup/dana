# 33-D1-CICD — GitHub Actions CI/CD Workflow

## What was done

Created `.github/workflows/deploy.yml` — a GitHub Actions workflow for auto-deploying Dana to Cloudflare Workers on push to `main`.

### Workflow details

| Trigger | Action |
|---------|--------|
| `push` to `main` | Full deploy pipeline |
| `workflow_dispatch` | Manual trigger via GitHub UI |

### Pipeline steps

1. **Checkout** → `actions/checkout@v4`
2. **pnpm setup** → `pnpm/action-setup@v4` (latest)
3. **Node 20 + cache** → `actions/setup-node@v4` with pnpm cache
4. **Install** → `pnpm install --frozen-lockfile`
5. **Build** → `opennextjs-cloudflare build` (not `next build` — this project uses OpenNext for Cloudflare, which generates the `.open-next/worker.js` entry point)
6. **E2E tests** → `pnpm test:e2e` (continue-on-error: true; optional for now)
7. **Deploy** → `cloudflare/wrangler-action@v3` → `wrangler deploy`
8. **D1 migrations** → `cloudflare/wrangler-action@v3` → `wrangler d1 migrations apply dana-db --remote`

### Deviations from initial task spec

The hardcoded `pnpm build` step was changed to `opennextjs-cloudflare build`. The project uses OpenNext for Cloudflare (package: `@opennextjs/cloudflare`), and its `wrangler.jsonc` sets `main: ".open-next/worker.js"`. Running `next build` alone would not produce the correct `.open-next/` output — the OpenNext build wrapper is required.

### Verification

- `.github/workflows/` directory created ✅
- `deploy.yml` written (46 lines, valid YAML) ✅

## GitHub Secrets Required

Danial must add these secrets to the GitHub repo (**Settings → Secrets and variables → Actions**):

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | API token with Workers + D1 write permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID (from dashboard) |
| `BETTER_AUTH_SECRET` | Auth secret used by Better Auth (already in `.env`) |

These can be set via GitHub web UI or with `gh secret set`:

```bash
gh secret set CLOUDFLARE_API_TOKEN --repo danialhaikal/dana
gh secret set CLOUDFLARE_ACCOUNT_ID --repo danialhaikal/dana
gh secret set BETTER_AUTH_SECRET --repo danialhaikal/dana
```
