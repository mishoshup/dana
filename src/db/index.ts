import { drizzle } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";
import * as schema from "./schema";

export function createDb(d1Db: D1Database) {
  return drizzle(d1Db, { schema });
}
