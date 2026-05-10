import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Validate an unknown body against a Zod schema.
 * Returns `{ data }` on success or `{ error: NextResponse }` on failure.
 */
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      error: NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      ),
    };
  }
  return { data: parsed.data };
}

/**
 * Wrap a Zod validation error in a standard NextResponse.
 */
export function validationError(zodError: z.ZodError) {
  return NextResponse.json(
    {
      error: "Validation failed",
      details: zodError.flatten().fieldErrors,
    },
    { status: 400 }
  );
}
