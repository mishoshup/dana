# Directory Structure

## Tree

```
dana/
├── prisma/
│   ├── schema.prisma          # Database schema (7 models, SQLite/D1 compatible)
│   └── dev.db                 # Local SQLite database
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── _headers               # Cloudflare headers config
│   └── *.svg                  # SVG assets
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx          # Login form
│   │   │   └── register/
│   │   │       └── page.tsx          # Registration form (not wired yet)
│   │   ├── api/
│   │   │   ├── auth/[...all]/
│   │   │   │   └── route.ts          # Better Auth catch-all handler
│   │   │   ├── debt/
│   │   │   │   ├── route.ts          # GET (list), POST (create)
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts      # GET, DELETE single debt
│   │   │   │       └── pay/
│   │   │   │           └── route.ts  # POST log payment
│   │   │   ├── grab/
│   │   │   │   └── route.ts          # GET (list), POST (create)
│   │   │   └── payments/
│   │   │       └── route.ts          # GET payment calendar list
│   │   ├── debt/
│   │   │   └── page.tsx              # Debt tracker page (client component)
│   │   ├── grab/
│   │   │   └── page.tsx              # Grab income page (client component)
│   │   ├── payments/
│   │   │   └── page.tsx              # Payments page (client component)
│   │   ├── subscriptions/
│   │   │   └── page.tsx              # Subscriptions page (client component)
│   │   ├── layout.tsx                # Root layout (dark theme, shell wrapper)
│   │   ├── page.tsx                  # Dashboard home page (client component)
│   │   ├── globals.css               # Tailwind v4 + custom CSS
│   │   └── favicon.ico
│   ├── components/
│   │   ├── shell.tsx                 # Main layout: sidebar + mobile nav + content
│   │   └── ui/                       # shadcn/ui generated components
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── sheet.tsx
│   │       ├── switch.tsx
│   │       └── table.tsx
│   └── lib/
│       ├── auth.ts                    # Better Auth server config
│       ├── auth-helpers.ts            # requireAuthTuple middleware
│       ├── db.ts                      # PrismaClient singleton
│       └── utils.ts                   # cn() helper (tailwind-merge + clsx)
├── .planning/                         # Project planning docs
│   ├── STATE.md
│   ├── ROADMAP.md
│   ├── config.json
│   ├── codebase/
│   │   ├── STACK.md
│   │   ├── ARCHITECTURE.md
│   │   └── STRUCTURE.md
│   └── review/                        # Agent review outputs
│       ├── explorer-report.md
│       ├── council-review.md
│       ├── pantheon-audit.md
│       └── fixer-changes.md
├── .env                               # Environment variables (gitignored)
├── .env.local                         # Local overrides (gitignored)
├── .dev.vars                          # Cloudflare dev vars (gitignored)
├── .gitignore
├── components.json                    # shadcn/ui configuration
├── eslint.config.mjs                  # ESLint flat config
├── next.config.ts                     # Next.js configuration
├── next-env.d.ts                      # Next.js type declarations
├── open-next.config.ts                # OpenNext Cloudflare configuration
├── package.json                       # Dependencies & scripts
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── postcss.config.mjs                 # PostCSS config (Tailwind v4)
├── tsconfig.json
├── tsconfig.tsbuildinfo
└── wrangler.jsonc                     # Cloudflare Workers configuration
```

## Key Files

| File | Role |
|------|------|
| `src/lib/auth.ts` | Better Auth server instance — the single authentication authority |
| `src/lib/db.ts` | PrismaClient singleton (local) |
| `src/lib/auth-helpers.ts` | `requireAuthTuple()` → used in every API route for session check |
| `src/components/shell.tsx` | App shell — sidebar nav, mobile bottom nav, responsive layout |
| `prisma/schema.prisma` | All 7 database models with relations |
| `open-next.config.ts` | Cloudflare Workers deployment adapter config |
| `wrangler.jsonc` | Cloudflare Workers runtime config (D1 binding, routes) |

## Patterns

**Client Components:** All page-level components use `"use client"` because they manage state (`useState`, `useEffect`) for data fetching. Future optimization could lift data fetching to RSC where possible.

**API Route Pattern:**
1. Call `requireAuthTuple()` at the top → returns `[NextResponse | null]`
2. Check `[authError]` — if truthy, return early
3. Proceed with Prisma operations

**Form Pattern:** Inline `useState` for form fields, `fetch()` POST on submit, re-fetch list on success. No form library yet.

**Data Fetching:** `useEffect` + `fetch()` directly in client components. No React Query, SWR, or server actions yet.
