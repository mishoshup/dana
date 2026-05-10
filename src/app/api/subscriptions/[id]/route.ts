import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/local";
import { subscription } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuthTuple } from "@/lib/auth-helpers";
import { subscriptionUpdateSchema } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [authError] = await requireAuthTuple();
  if (authError) return authError;

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Subscription ID required" }, { status: 400 });
    }

    const body = await req.json();

    const parsed = subscriptionUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const [updatedSubscription] = await db.update(subscription)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.cost !== undefined && { cost: data.cost }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.rating !== undefined && { rating: data.rating }),
        ...(data.active !== undefined && { active: data.active }),
        ...(data.renewalDate !== undefined && { renewalDate: data.renewalDate ? new Date(data.renewalDate).toISOString() : null }),
        ...(data.notes !== undefined && { notes: data.notes }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(subscription.id, id))
      .returning();

    if (!updatedSubscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    return NextResponse.json(updatedSubscription);
  } catch (error) {
    console.error("Database error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
