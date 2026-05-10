import { getAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

async function getAuthHandler() {
  const auth = await getAuth();
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
