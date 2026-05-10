import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import type { D1Database } from "@cloudflare/workers-types";

/**
 * CLOUDFLARE D1: Creates a PrismaClient backed by a D1 database binding.
 *
 * This file is deliberately separate from `src/lib/db.ts` so that the
 * `@prisma/adapter-d1` (and its transitive Edge/Workerd dependencies) are
 * never imported by the auth/middleware chain, which runs on Next.js Edge
 * Runtime.
 *
 * Import this file ONLY in Cloudflare Worker / OpenNext worker contexts:
 *
 *   import { createPrismaClientD1 } from "@/lib/db-cloudflare";
 *   const prisma = createPrismaClientD1({ DB: env.dana_db });
 *
 * @param env - Object containing a D1 database binding as `DB`.
 * @returns A configured PrismaClient instance using the D1 adapter.
 */
export function createPrismaClientD1(env: { DB: D1Database }) {
  const adapter = new PrismaD1(env.DB);
  return new PrismaClient({ adapter });
}
