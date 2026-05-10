# 35-PRISMA-UPGRADE.md — Prisma v6.19.3 with engineType = "client"

## Summary

Upgraded Prisma from v6.6.0 to v6.19.3 and switched to pure TypeScript client mode (`engineType = "client"`) — removing all Rust/WASM query engine files from the generated client bundle.

## Changes Made

### 1. Package upgrades
- `prisma`: 6.6.0 → **6.19.3** (latest v6.x)
- `@prisma/client`: 6.6.0 → **6.19.3**
- `@prisma/adapter-d1`: 6.6.0 → **6.19.3** (matching compat)

### 2. Schema change (`prisma/schema.prisma`)
```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
  engineType = "client"       // ← ADDED
}
```

## Verification

- `npx prisma generate` → ✅ Success (117ms)
- `engineType = "client"` → Zero WASM files in the generated client:

```
Active client: node_modules/.pnpm/@prisma+client@6.19.3_...
WASM files found: NONE 🎉
```

- Old leftover WASM files from stale pnpm store entries (v5.22.0, v6.6.0) exist but are **not in the dependency tree** and won't be bundled.

## Notes

- Tested Prisma v7.8.0 first, but **v7.x removed `url` from datasource blocks** in schema.prisma, requiring `prisma.config.ts` migration. Since the spec said "v6.16+", stuck with v6.19.3 (latest v6) to avoid breaking migration config.
- The `driverAdapters` preview feature is now deprecated in v6.19.3 (functionality is default); can be removed in a future cleanup.
- `pnpm dedupe` also bumped `better-auth` from 1.2.0 → 1.4.21 as a side effect of dependency resolution — verify this is intentional.
