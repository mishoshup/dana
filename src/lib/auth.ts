import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import type { D1Database } from "@cloudflare/workers-types";
import * as schema from "@/db/schema";

/**
 * Create a Better Auth instance.
 *
 * @param d1Db - Optional D1 binding (Cloudflare Workers). When provided,
 *               uses Drizzle D1 adapter. Otherwise uses libSQL adapter with
 *               the local SQLite file.
 */
export function createAuth(d1Db?: D1Database) {
  const db = d1Db
    ? drizzleD1(d1Db, { schema })
    : drizzleLibsql(
        createClient({
          url: process.env.DATABASE_URL?.replace("file:", "file://") || "file://./prisma/dev.db",
        }),
        { schema }
      );

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
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
