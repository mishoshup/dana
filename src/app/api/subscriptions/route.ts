import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/local";
import { subscription } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAuthTuple } from "@/lib/auth-helpers";
import { subscriptionSchema } from "@/lib/validation";

export async function GET() {
  const [authError] = await requireAuthTuple();
  if (authError) return authError;

  try {
    const subscriptions = await db.select().from(subscription)
      .orderBy(desc(subscription.cost))
      .all();
    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error("Database error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const [authError] = await requireAuthTuple();
  if (authError) return authError;

  try {
    const body = await req.json();

    const parsed = subscriptionSchema.safeParse(body);
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
    const [newSubscription] = await db.insert(subscription).values({
      id: crypto.randomUUID(),
      name: data.name,
      cost: data.cost,
      category: data.category ?? null,
      rating: data.rating,
      active: data.active,
      renewalDate: data.renewalDate ? new Date(data.renewalDate).toISOString() : null,
      notes: data.notes ?? null,
      updatedAt: new Date().toISOString(),
    }).returning();

    return NextResponse.json(newSubscription, { status: 201 });
  } catch (error) {
    console.error("Database error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
