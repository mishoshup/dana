import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAuthTuple } from "@/lib/auth-helpers";
import { subscriptionSchema } from "@/lib/validation";

export async function GET() {
  const [authError] = await requireAuthTuple();
  if (authError) return authError;

  try {
    const subscriptions = await prisma.subscription.findMany({
      orderBy: { cost: "desc" },
    });
    return NextResponse.json(subscriptions);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
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
    const subscription = await prisma.subscription.create({
      data: {
        name: data.name,
        cost: data.cost,
        category: data.category ?? null,
        rating: data.rating,
        active: data.active,
        renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
        notes: data.notes ?? null,
      },
    });

    return NextResponse.json(subscription, { status: 201 });
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
