import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/**
 * Get the current auth session from request headers.
 * Returns null if no valid session.
 */
export async function getSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  } catch {
    return null;
  }
}

/**
 * Require a valid session for an API route.
 * Returns the session if authenticated, or a 401 NextResponse if not.
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }
  return session;
}

/**
 * Wraps the result of requireAuth in a tuple.
 * If auth failed, returns [response, null].
 * If auth succeeded, returns [null, session].
 */
export async function requireAuthTuple(): Promise<
  [NextResponse, null] | [null, typeof auth.$Infer.Session]
> {
  const result = await requireAuth();
  if (result instanceof NextResponse) {
    return [result, null];
  }
  return [null, result];
}
