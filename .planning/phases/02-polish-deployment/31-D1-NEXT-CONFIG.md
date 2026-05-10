# D1 Deployment — Fix next.config.ts

## Summary

Updated `next.config.ts` to add `serverExternalPackages` configuration for Prisma.

## Changes

**File:** `next.config.ts`

Added `serverExternalPackages` array to the Next.js config object:

```ts
import type { NextConfig } from "next";

// Cloudflare configuration is managed in open-next.config.ts and wrangler.jsonc
const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-d1"],
};

export default nextConfig;
```

## Why

- Next.js needs to bundle Prisma packages (`@prisma/client`, `@prisma/adapter-d1`) for Cloudflare Workers
- Without this, the Worker bundle will fail at runtime when Prisma tries to import these modules
- The comment about Cloudflare config being managed elsewhere was preserved

## Pre-existing Cleanup

- The orphan `if (process.env.OPENNEXT_CLOUDFLARE)` block was already cleaned previously — no further action needed.

## Status

✅ Done.
