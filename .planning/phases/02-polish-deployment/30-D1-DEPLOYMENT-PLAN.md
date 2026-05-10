# D1 Deployment + CI/CD Plan

> Progress: Research complete. Ready for implementation.
> Domain `danialsanusi.com` is already on Cloudflare NS. D1 database `dana-db` already created (ID: `f6cbe705-0cc7-4860-ba34-9a739262d60d`).

---

## Phase 0: Prerequisites (Danial runs manually)

### 0.1 Authenticate Wrangler
```bash
cd /Users/danialhaikal/personal/dana
npx wrangler login
```
Opens a browser — log in to your Cloudflare account (danialhaikal@gmail.com / whatever account owns danialsanusi.com).

### 0.2 Generate BETTER_AUTH_SECRET
```bash
openssl rand -base64 32
```
Save this. You'll set it as a Cloudflare Worker secret later.

### 0.3 (Optional) Generate a GitHub Personal Access Token
Only needed if repo is private. Create at https://github.com/settings/tokens with `repo` scope.

---

## Phase 1: Code Changes (We automate)

### 1.1 Update `next.config.ts` — Prisma Cloudflare Compatibility

**Why:** OpenNext needs Prisma's generated client to be included in the Worker bundle. Without this, `@prisma/client` fails at runtime.

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-d1"],
};

export default nextConfig;
```

### 1.2 Refactor `src/lib/auth.ts` — Support D1 in Production

**Why:** Currently `auth.ts` imports a standard `PrismaClient` that reads `DATABASE_URL` from `.env`. On Cloudflare Workers, the database is a D1 binding accessed via `env.dana_db`. We need a factory pattern.

Replace `src/lib/auth.ts` with:

```ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import type { D1Database } from "@cloudflare/workers-types";

/**
 * Create a Better Auth instance.
 *
 * @param d1Db  - Optional D1 binding (Cloudflare Workers). When provided,
 *                uses PrismaD1 adapter. Otherwise uses standard PrismaClient
 *                with DATABASE_URL from the environment (local dev).
 */
export function createAuth(d1Db?: D1Database) {
  const prisma = d1Db
    ? new PrismaClient({ adapter: new PrismaD1(d1Db) })
    : new PrismaClient();

  return betterAuth({
    database: prismaAdapter(prisma, { provider: "sqlite" }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
    },
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
    },
    advanced: {
      cookiePrefix: "dana",
      csrf: {
        enabled: true,
        origin: process.env.BETTER_AUTH_URL || "http://localhost:3000",
      },
      rateLimit: {
        enabled: true,
        window: 60,
        max: 10,
      },
    },
  });
}

/**
 * Default auth instance for local development.
 * Created at module level for convenience in route handlers,
 * scripts, and Better Auth CLI tooling.
 */
export const auth = createAuth();

export type Session = typeof auth.$Infer.Session;
```

### 1.3 Update `src/app/api/auth/[...all]/route.ts` — Cloudflare-Aware Handler

**Why:** The route handler imports the `auth` singleton. On Cloudflare Workers, it needs to pass the D1 binding.

```ts
import { createAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";

async function getAuthHandler() {
  let auth;
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (env.dana_db) {
      auth = createAuth(env.dana_db);
    } else {
      auth = createAuth();
    }
  } catch {
    auth = createAuth();
  }
  return toNextJsHandler(auth);
}

export const GET = async (request: Request) => {
  const { GET: handler } = await getAuthHandler();
  return handler(request);
};

export const POST = async (request: Request) => {
  const { POST: handler } = await getAuthHandler();
  return handler(request);
};
```

### 1.4 Verify `src/lib/db` and `src/lib/db-cloudflare.ts` are correct

The existing separation is good:
- `db.ts` = local dev (standard PrismaClient)
- `db-cloudflare.ts` = Cloudflare worker (PrismaD1 adapter)
- No changes needed here — they're used by `createAuth()` internally

### 1.5 Update `cloudflare-env.d.ts` (regenerate types)

Run after wrangler.jsonc is finalized:
```bash
cd /Users/danialhaikal/personal/dana
npx wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts
```

---

## Phase 2: Cloudflare Infrastructure (Danial runs manually once)

### 2.1 Verify D1 Database Exists
```bash
npx wrangler d1 list
```
Should show `dana-db` (already created). If not:
```bash
npx wrangler d1 create dana-db
```

### 2.2 Run Prisma Migrations on D1

**Prisma cannot auto-migrate D1.** We need to:
1. Generate a SQL migration from Prisma schema
2. Apply it to D1 via `wrangler d1 execute`

```bash
# 1. Export Prisma schema as SQL migration
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel ./prisma/schema.prisma \
  --script > ./prisma/migrations/0001_initial.sql

# 2. Apply to production D1
npx wrangler d1 execute dana-db --remote --file=./prisma/migrations/0001_initial.sql

# 3. (Optional) Apply to local D1 for dev
npx wrangler d1 execute dana-db --local --file=./prisma/migrations/0001_initial.sql
```

**Alternative (if you want proper Prisma migration tracking):**
```bash
npx prisma migrate dev --name init --skip-generate
# Then convert the generated migration to D1-compatible SQL
```

### 2.3 Set Production Secrets
```bash
echo "<your-generated-secret>" | npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put BETTER_AUTH_URL
# Value for BETTER_AUTH_URL: https://finance.danialsanusi.com
```

### 2.4 Create R2 Bucket (if not exists)
```bash
npx wrangler r2 bucket create dana-opennext-cache
```

---

## Phase 3: GitHub Actions CI/CD (We create)

### 3.1 Create `.github/workflows/deploy.yml`

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]
  workflow_dispatch: # Allow manual triggers

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          DATABASE_URL: "file:./prisma/dev.db"
          BETTER_AUTH_SECRET: ${{ secrets.BETTER_AUTH_SECRET }}
          BETTER_AUTH_URL: "http://localhost:3000"

      - name: Build & Deploy to Cloudflare Workers
        run: pnpm deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Apply D1 migrations
        run: |
          npx prisma migrate diff \
            --from-empty \
            --to-schema-datamodel ./prisma/schema.prisma \
            --script > ./prisma/migrations/ci_$(date +%s).sql
          npx wrangler d1 execute dana-db \
            --remote --file=./prisma/migrations/ci_$(date +%s).sql
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### 3.2 GitHub Secrets Needed

Danial adds these in repo Settings → Secrets and variables → Actions:

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token (generate in dashboard: `Edit Cloudflare Workers` template) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID (from dashboard sidebar) |
| `BETTER_AUTH_SECRET` | The `openssl rand -base64 32` output from Phase 0.2 |

### 3.3 Readme Updates

Update `README.md` to show:
- Build status badge
- Live URL: `https://finance.danialsanusi.com`
- Deploy instructions

---

## Phase 4: Domain Setup (Danial runs manually via Cloudflare Dashboard)

### 4.1 Add Finance Subdomain

Since `danialsanusi.com` is already on Cloudflare NS:

**Option A: Cloudflare Dashboard (easiest)**
1. Go to Workers & Pages → dana → Custom Domains
2. Add `finance.danialsanusi.com`
3. Cloudflare auto-provisions TLS certificate

**Option B: Wrangler CLI**
```bash
npx wrangler deploy --routes "finance.danialsanusi.com/*"
```
Then in Cloudflare Dashboard: DNS → Add CNAME record:
- Type: CNAME
- Name: finance
- Target: dana.<your-subdomain>.workers.dev
- Proxy: Proxied (orange cloud)

### 4.2 Configure Route

In `wrangler.jsonc`, add:
```json
{
  // ...existing config
  "routes": [
    { "pattern": "finance.danialsanusi.com", "custom_domain": true }
  ]
}
```
Or use `--routes "finance.danialsanusi.com/*"` during deploy.

---

## Phase 5: Local Preview with Wrangler (Optional but Recommended)

Before deploying to production, test locally:
```bash
cd /Users/danialhaikal/personal/dana

# Build and preview
pnpm preview

# Open http://localhost:8787
```

This runs the OpenNext build + Wrangler dev server with local D1 emulation.

---

## Potential Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Prisma + D1 compatibility bug** | Auth fails on Workers | Test with `preview` first. Pin Prisma version. OpenNext has known issues with newer Prisma — check opennextjs-cloudflare issues |
| **Better Auth rate limiting lost** | Brute force on login | Rate limiting is in-memory per Worker instance; requests hitting different isolates bypass it. Add Cloudflare WAF rate limiting rule as backup |
| **Auth singleton recreated per request** | Performance overhead | The factory creates a new PrismaClient each time. Mitigate by using a WeakMap/Map to cache clients by request |
| **Middleware redirect on static assets** | Broken CSS/JS | Already handled — middleware skips static file regex |
| **D1 cold read** | Slow first request after idle | D1 has sub-ms reads on warm, but cold reads take ~200ms. Acceptable for a personal finance app |
| **D1 writes fail silently** | Data loss | Ensure D1 `run()` results are checked. Add error logging |
| **CI test failure on non-standard DB** | E2E tests use SQLite, not D1 | Tests are fine with SQLite — same schema. Just ensure test DB is freshly seeded |

---

## Verification Steps (Post-Deployment)

After first deploy, verify:

1. **App loads**: Visit `https://finance.danialsanusi.com` — should show login page
2. **Registration**: Create an account — should redirect to dashboard
3. **Login**: Log out, log back in — session should persist
4. **Debt CRUD**: Create, view, edit, delete a debt entry
5. **Grab entry**: Add a Grab entry
6. **Dashboard**: Verify dashboard shows income/expenses/surplus
7. **Mobile**: Test on phone — responsive layout should work
8. **SSL**: Verify TLS certificate is valid (green padlock)

### CLI Verification
```bash
# Check Worker status
npx wrangler deployments list

# Check D1 data
npx wrangler d1 execute dana-db --remote --command="SELECT COUNT(*) as user_count FROM User;"

# Check logs (last 10)
npx wrangler tail
```

---

## Appendix: Useful Commands

```bash
# Local dev (standard)
pnpm dev                    # http://localhost:3000

# Local preview (Wrangler)
pnpm preview                # http://localhost:8787

# Deploy manually
pnpm deploy                 # Build + wrangler deploy

# Check D1 tables
npx wrangler d1 execute dana-db --remote --command=".tables"

# View D1 data
npx wrangler d1 execute dana-db --remote --command="SELECT * FROM User;"

# Read Worker logs
npx wrangler tail

# Regenerate Cloudflare types
npx wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts
```

---

## Files Modified Summary

| File | Change |
|------|--------|
| `next.config.ts` | Add `serverExternalPackages: ["@prisma/client", "@prisma/adapter-d1"]` |
| `src/lib/auth.ts` | Refactor to `createAuth(d1Db?)` factory + default `auth` export |
| `src/app/api/auth/[...all]/route.ts` | Fetch D1 binding from `getCloudflareContext()` and create auth per request |
| `.github/workflows/deploy.yml` | New — CI/CD pipeline |
| `prisma/migrations/0001_initial.sql` | New — initial D1 migration |
| `cloudflare-env.d.ts` | Regenerate types with `wrangler types` |

---

## Dependency Graph

```
next.config.ts (serverExternalPackages)
        │
        ▼
src/lib/db-cloudflare.ts  ◄── src/lib/auth.ts (createAuth factory)
        │                          │
        ▼                          ▼
src/app/api/auth/[...all]/route.ts  ◄── .github/workflows/deploy.yml
        │                                    │
        ▼                                    ▼
Cloudflare Worker (wrangler deploy)    GitHub Actions (CI/CD)
        │
        ▼
D1 (dana-db) ◄── Prisma migrations
        │
        ▼
finance.danialsanusi.com (custom domain)
```
