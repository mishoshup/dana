import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";
import * as schema from "@/db/schema";

/**
 * Create a Better Auth instance.
 *
 * @param d1Db - Optional D1 binding (Cloudflare Workers). When provided,
 *               uses Drizzle D1 adapter. Otherwise uses libSQL adapter with
 *               the local SQLite file (dynamically imported so it doesn't
 *               crash on Workers).
 */
export async function createAuth(d1Db?: D1Database) {
  if (d1Db) {
    // Workers: use D1 adapter
    return betterAuth({
      database: drizzleAdapter(drizzleD1(d1Db, { schema }), {
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

  // Local dev: dynamically import @libsql/client so it's never loaded on Workers
  const [{ createClient }, { drizzle }] = await Promise.all([
    import("@libsql/client"),
    import("drizzle-orm/libsql"),
  ]);

  return betterAuth({
    database: drizzleAdapter(
      drizzle(
        createClient({
          url: process.env.DATABASE_URL?.replace("file:", "file://") || "file://./prisma/dev.db",
        }),
        { schema }
      ),
      { provider: "sqlite", schema }
    ),
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

// Lazy singleton for local development
let _auth: Awaited<ReturnType<typeof createAuth>> | undefined;

/**
 * Returns a Better Auth instance:
 * - On Cloudflare Workers: uses D1 via getCloudflareContext()
 * - On local dev: dynamically imports @libsql/client
 */
export async function getAuth(d1Db?: D1Database) {
  if (d1Db) {
    return createAuth(d1Db);
  }

  // On Workers, try to get D1 binding
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    if ((env as any)?.dana_db) {
      return createAuth((env as any).dana_db as D1Database);
    }
  } catch {
    // Not on Workers — fall through to local dev
  }

  if (!_auth) {
    _auth = await createAuth();
  }
  return _auth;
}

// Infer session type without calling createAuth at module level
type _CreateAuthType = Awaited<ReturnType<typeof createAuth>>;
export type Session = _CreateAuthType["$Infer"]["Session"];
