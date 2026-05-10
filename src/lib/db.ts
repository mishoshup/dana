import { PrismaClient } from "@prisma/client";

/**
 * LOCAL DEV: Standard PrismaClient with SQLite (DATABASE_URL from .env).
 *
 * Usage (local dev, tests, scripts):
 *   import { prisma } from "@/lib/db";
 *   await prisma.user.findMany();
 *
 * For Cloudflare D1 deployment, see src/lib/db-cloudflare.ts.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;


