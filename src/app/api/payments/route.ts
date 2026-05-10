import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAuthTuple } from "@/lib/auth-helpers";
import { paymentSchema, paymentUpdateSchema } from "@/lib/validation";

export async function GET() {
  const [authError] = await requireAuthTuple();
  if (authError) return authError;

  try {
    const payments = await prisma.paymentCalendar.findMany({
      orderBy: { dueDate: "asc" },
      take: 50,
      include: {
        debt: {
          select: { type: true },
        },
      },
    });
    return NextResponse.json(payments);
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

    const parsed = paymentSchema.safeParse(body);
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
    const payment = await prisma.paymentCalendar.create({
      data: {
        debtId: data.debtId ?? null,
        dueDate: new Date(data.dueDate),
        amount: data.amount,
        status: data.status,
        paidDate: data.paidDate ? new Date(data.paidDate) : null,
        notes: data.notes ?? null,
      },
    });
    return NextResponse.json(payment, { status: 201 });
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

export async function PATCH(req: NextRequest) {
  const [authError] = await requireAuthTuple();
  if (authError) return authError;

  try {
    const body = await req.json();

    const parsed = paymentUpdateSchema.safeParse(body);
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

    const existing = await prisma.paymentCalendar.findUnique({
      where: { id: data.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    const payment = await prisma.paymentCalendar.update({
      where: { id: data.id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.paidDate !== undefined && { paidDate: data.paidDate ? new Date(data.paidDate) : null }),
      },
    });
    return NextResponse.json(payment);
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
