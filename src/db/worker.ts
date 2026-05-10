import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";
import * as schema from "./schema";

let db: DrizzleD1Database<typeof schema> | undefined;

export function getWorkerDb() {
  if (!db) {
    const { env } = getCloudflareContext();
    db = drizzle(env.dana_db as D1Database, { schema });
  }
  return db;
}
