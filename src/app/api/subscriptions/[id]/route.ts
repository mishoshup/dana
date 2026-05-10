import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
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
    const subscription = await prisma.subscription.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.cost !== undefined && { cost: data.cost }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.rating !== undefined && { rating: data.rating }),
        ...(data.active !== undefined && { active: data.active }),
        ...(data.renewalDate !== undefined && { renewalDate: data.renewalDate ? new Date(data.renewalDate) : null }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    return NextResponse.json(subscription);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
