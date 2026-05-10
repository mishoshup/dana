import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAuthTuple } from "@/lib/auth-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [authError] = await requireAuthTuple();
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await req.json();

    // Validate amount
    const amount = parseFloat(body.amount);
    if (!amount || amount <= 0 || isNaN(amount)) {
      return NextResponse.json(
        { error: "Payment amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Validate debt exists
    const debt = await prisma.debt.findUnique({ where: { id } });
    if (!debt) {
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    if (debt.status === "paid") {
      return NextResponse.json(
        { error: "This debt is already fully paid" },
        { status: 400 }
      );
    }

    // Atomic transaction: log payment + update balance
    const [payment, updatedDebt] = await prisma.$transaction([
      prisma.paymentCalendar.create({
        data: {
          debtId: id,
          dueDate: new Date(body.date || new Date()),
          amount: Math.min(amount, debt.balance),
          status: "paid",
          paidDate: new Date(),
          notes: body.notes || null,
        },
      }),
      prisma.debt.update({
        where: { id },
        data: {
          balance: Math.max(0, debt.balance - amount),
          status: debt.balance - amount <= 0 ? "paid" : "active",
        },
      }),
    ]);

    return NextResponse.json(
      {
        payment,
        debt: updatedDebt,
        remaining: Math.max(0, debt.balance - amount),
        fullyPaid: debt.balance - amount <= 0,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Payment log error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
