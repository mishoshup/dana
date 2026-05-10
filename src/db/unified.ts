import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core/db";
import type { D1Database } from "@cloudflare/workers-types";
import * as schema from "./schema";

type Database = BaseSQLiteDatabase<"async", any, typeof schema>;
let _db: Database | undefined;

/**
 * Returns a database connection:
 * - On Cloudflare Workers: uses D1 via getCloudflareContext()
 * - On local dev: dynamically imports @libsql/client
 *
 * NOTE: On Workers, we NEVER import @libsql/client — it's only for local dev.
 * The dynamic import ensures esbuild doesn't bundle it into the worker.
 */
export async function getDb(): Promise<Database> {
  if (_db) return _db;

  // Try Cloudflare Workers first
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    if ((env as any)?.dana_db) {
      const { drizzle } = await import("drizzle-orm/d1");
      _db = drizzle((env as any).dana_db as D1Database, { schema }) as unknown as Database;
      return _db;
    }
  } catch {
    // Not running on Workers — fall through to local dev
  }

  // Local dev path: dynamically import @libsql/client so it's never loaded on Workers
  const [{ createClient }, { drizzle }] = await Promise.all([
    import("@libsql/client") as Promise<typeof import("@libsql/client")>,
    import("drizzle-orm/libsql") as Promise<typeof import("drizzle-orm/libsql")>,
  ]);

  const client = createClient({
    url: process.env.DATABASE_URL?.replace("file:", "file://") || "file://./prisma/dev.db",
  });

  _db = drizzle(client, { schema }) as unknown as Database;
  return _db;
}
