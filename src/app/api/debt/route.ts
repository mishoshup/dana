import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/unified";
import { debt as debtTable, paymentCalendar as paymentCalendarTable } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { requireAuthTuple } from "@/lib/auth-helpers";
import { debtSchema } from "@/lib/validation";

export async function GET() {
  const [authError] = await requireAuthTuple();
  if (authError) return authError;

  try {
    const db = await getDb();
    const debtList = await db.select().from(debtTable)
      .orderBy(desc(debtTable.balance))
      .all();

    // Payments need a separate query (Drizzle doesn't have Prisma's include)
    const debtIds = debtList.map((d) => d.id);
    const allPayments = debtIds.length > 0
      ? await db.select().from(paymentCalendarTable)
          .where(inArray(paymentCalendarTable.debtId, debtIds))
          .orderBy(desc(paymentCalendarTable.dueDate))
          .all()
      : [];

    // Group payments by debtId, take first 5 per debt
    const paymentsByDebt: Record<string, typeof allPayments> = {};
    for (const p of allPayments) {
      const key = p.debtId!;
      if (!paymentsByDebt[key]) paymentsByDebt[key] = [];
      paymentsByDebt[key].push(p);
    }

    const debts = debtList.map((d) => ({
      ...d,
      payments: (paymentsByDebt[d.id] || []).slice(0, 5),
    }));

    return NextResponse.json(debts);
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
    const db = await getDb();
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
    const [debt] = await db.insert(debtTable).values({
      id: crypto.randomUUID(),
      type: data.type,
      balance: data.balance,
      monthlyPayment: data.monthlyPayment,
      interestRate: data.interestRate ?? null,
      startDate: new Date(data.startDate || new Date()).toISOString(),
      endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
      status: data.status,
      notes: data.notes ?? null,
      updatedAt: new Date().toISOString(),
    }).returning();

    return NextResponse.json(debt, { status: 201 });
  } catch (error) {
    console.error("Database error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
