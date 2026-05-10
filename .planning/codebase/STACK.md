# Technology Stack

**Analysis Date:** 2026-05-10

## Languages & Runtime

**Primary:**
- TypeScript 5.x — All application code (pages, APIs, components, lib)
- JavaScript/JSX — Generated/config shims (next.config.ts, postcss)

**Runtime:**
- Node.js 20+ — Local development
- Cloudflare Workers (via OpenNext) — Production deployment target

## Framework

| Library | Version | Purpose | Integration |
|---------|---------|---------|-------------|
| Next.js | 16.2.6 | Full-stack React framework (App Router) | Core framework |
| React | 19.2.4 | UI component model | Peer dep of Next.js |
| Tailwind CSS | 4.x | Utility-first CSS via PostCSS | `@tailwindcss/postcss` plugin |
| shadcn/ui | 4.x | Component library (tailwind-based) | `npx shadcn add`; components in `src/components/ui/` |
| base-ui | 1.4.1 | Headless React primitives (shadcn depends on this) | Build-time dependency |

## Backend / Data

| Library | Version | Purpose | Integration |
|---------|---------|---------|-------------|
| Next.js API Routes | — | REST endpoints under `src/app/api/` | App Router Route Handlers |
| Prisma | 6.6.0 | ORM + schema management | `@prisma/client` + `prisma` CLI |
| SQLite (Turso/local) | — | Local development database | `prisma/dev.db` via `DATABASE_URL` in `.env` |
| Prisma D1 Adapter | 6.6.0 | Cloudflare D1 adapter (for prod) | `@prisma/adapter-d1` |
| Better Auth | 1.2.0 | Authentication (email/password, sessions) | Prisma adapter, `src/lib/auth.ts` |
| OpenNext Cloudflare | 1.19.8 | Next.js → Cloudflare Workers adapter | Build pipeline (`opennextjs-cloudflare build`) |

## Storage (Future)

- **Cloudflare D1** — Relational DB in production (SQLite-compatible)
- **Cloudflare R2** — Possible future backup/export storage

## UI & Visualization

| Library | Version | Purpose |
|---------|---------|---------|
| Lucide React | 1.14.0 | Icon set |
| Recharts | 3.8.1 | Charts (bar charts for debt, grab income) |
| class-variance-authority | 0.7.1 | CVA for component variants |
| clsx | 2.1.1 | Conditional class helpers |
| tailwind-merge | 3.5.0 | Tailwind class deduplication |
| tw-animate-css | 1.4.0 | Tailwind animation utilities |

## Dev Tooling

- **TypeScript** 5.x — Type checking
- **ESLint** 9.x + `eslint-config-next` — Linting
- **Wrangler** 4.x — Cloudflare Workers CLI (deploy, dev, types)
- **pnpm** — Package manager (workspace-enabled)
- **PostCSS** — CSS processing (via Tailwind v4)

## Platform Targets

| Target | Environment | Adapter |
|--------|-------------|---------|
| Local dev | macOS (SQLite) | Standard Next.js dev server `next dev` |
| Production | Cloudflare Workers (D1) | opennextjs-cloudflare + wrangler |

---

*Stack analysis: 2026-05-10*
