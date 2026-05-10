import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/local";
import { debt as debtTable, paymentCalendar as paymentCalendarTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuthTuple } from "@/lib/auth-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [authError] = await requireAuthTuple();
  if (authError) return authError;

  try {
    const { id } = await params;
    const body: { amount: string; date?: string; notes?: string } = await req.json();

    // Validate amount
    const amount = parseFloat(body.amount);
    if (!amount || amount <= 0 || isNaN(amount)) {
      return NextResponse.json(
        { error: "Payment amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Validate debt exists
    const debts = await db.select().from(debtTable).where(eq(debtTable.id, id)).limit(1).all();
    const debt = debts[0];
    if (!debt) {
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    if (debt.status === "paid") {
      return NextResponse.json(
        { error: "This debt is already fully paid" },
        { status: 400 }
      );
    }

    const currentBalance = Number(debt.balance);

    // Atomic transaction: log payment + update balance
    const result = await db.transaction(async (tx) => {
      const [payment] = await tx.insert(paymentCalendarTable).values({
        id: crypto.randomUUID(),
        debtId: id,
        dueDate: new Date(body.date ?? new Date()).toISOString(),
        amount: Math.min(amount, currentBalance),
        status: "paid",
        paidDate: new Date().toISOString(),
        notes: body.notes ?? null,
        updatedAt: new Date().toISOString(),
      }).returning();

      const [updatedDebt] = await tx.update(debtTable)
        .set({
          balance: Math.max(0, currentBalance - amount),
          status: currentBalance - amount <= 0 ? "paid" : "active",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(debtTable.id, id))
        .returning();

      return { payment, updatedDebt };
    });

    return NextResponse.json(
      {
        payment: result.payment,
        debt: result.updatedDebt,
        remaining: Math.max(0, currentBalance - amount),
        fullyPaid: currentBalance - amount <= 0,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Payment log error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
