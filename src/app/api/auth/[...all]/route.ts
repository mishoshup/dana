import { createAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// In local development (NODE_ENV=development), use local libSQL only.
// In production (Cloudflare Workers, NODE_ENV=production), try D1 first,
// falling back to local libSQL if D1 is unavailable.
const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.NEXTJS_ENV === "production";

async function getAuthHandler() {
  let auth;

  if (isProduction) {
    // On Cloudflare Workers — try D1, fall back to local SQLite
    try {
      const { getCloudflareContext } = await import(
        "@opennextjs/cloudflare"
      );
      const { env } = await getCloudflareContext({ async: true });
      if (env.dana_db) {
        auth = createAuth(env.dana_db);
      } else {
        auth = createAuth();
      }
    } catch {
      auth = createAuth();
    }
  } else {
    // Local development — always use local libSQL
    auth = createAuth();
  }

  return toNextJsHandler(auth);
}

export const GET = async (request: Request) => {
  const { GET: handler } = await getAuthHandler();
  return handler(request);
};

export const POST = async (request: Request) => {
  const { POST: handler } = await getAuthHandler();
  return handler(request);
};
