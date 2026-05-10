import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAuthTuple } from "@/lib/auth-helpers";
import { debtSchema } from "@/lib/validation";

export async function GET() {
  const [authError] = await requireAuthTuple();
  if (authError) return authError;

  try {
    const debts = await prisma.debt.findMany({
      orderBy: { balance: "desc" },
      include: {
        payments: {
          orderBy: { dueDate: "desc" },
          take: 5,
        },
      },
    });
    return NextResponse.json(debts);
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

    const parsed = debtSchema.safeParse(body);
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
    const debt = await prisma.debt.create({
      data: {
        type: data.type,
        balance: data.balance,
        monthlyPayment: data.monthlyPayment,
        interestRate: data.interestRate ?? null,
        startDate: new Date(data.startDate || new Date()),
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: data.status,
        notes: data.notes ?? null,
      },
    });

    return NextResponse.json(debt, { status: 201 });
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
