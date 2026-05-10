import * as schema from "./schema";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

let _db: LibSQLDatabase<typeof schema> | undefined;

export async function getLocalDb(): Promise<LibSQLDatabase<typeof schema>> {
  if (!_db) {
    const [{ createClient }, { drizzle }] = await Promise.all([
      import("@libsql/client"),
      import("drizzle-orm/libsql"),
    ]);
    const client = createClient({
      url:
        process.env.DATABASE_URL?.replace("file:", "file://") || "file://./prisma/dev.db",
    });
    _db = drizzle(client, { schema}) as LibSQLDatabase<typeof schema>;
  }
  return _db;
}
