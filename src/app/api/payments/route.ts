import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/local";
import { paymentCalendar as paymentCalendarTable, debt as debtTable } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { requireAuthTuple } from "@/lib/auth-helpers";
import { paymentSchema, paymentUpdateSchema } from "@/lib/validation";

export async function GET() {
  const [authError] = await requireAuthTuple();
  if (authError) return authError;

  try {
    const payments = await db.select({
      id: paymentCalendarTable.id,
      debtId: paymentCalendarTable.debtId,
      dueDate: paymentCalendarTable.dueDate,
      amount: paymentCalendarTable.amount,
      status: paymentCalendarTable.status,
      paidDate: paymentCalendarTable.paidDate,
      notes: paymentCalendarTable.notes,
      createdAt: paymentCalendarTable.createdAt,
      updatedAt: paymentCalendarTable.updatedAt,
      debt: { type: debtTable.type },
    })
      .from(paymentCalendarTable)
      .leftJoin(debtTable, eq(paymentCalendarTable.debtId, debtTable.id))
      .orderBy(asc(paymentCalendarTable.dueDate))
      .limit(50)
      .all();
    return NextResponse.json(payments);
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
    const [payment] = await db.insert(paymentCalendarTable).values({
      id: crypto.randomUUID(),
      debtId: data.debtId ?? null,
      dueDate: new Date(data.dueDate).toISOString(),
      amount: data.amount,
      status: data.status,
      paidDate: data.paidDate ? new Date(data.paidDate).toISOString() : null,
      notes: data.notes ?? null,
      updatedAt: new Date().toISOString(),
    }).returning();
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Database error:", error);
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

    const existing = await db.select()
      .from(paymentCalendarTable)
      .where(eq(paymentCalendarTable.id, data.id))
      .limit(1)
      .all();
    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    const [payment] = await db.update(paymentCalendarTable)
      .set({
        ...(data.status !== undefined && { status: data.status }),
        ...(data.paidDate !== undefined && { paidDate: data.paidDate ? new Date(data.paidDate).toISOString() : null }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(paymentCalendarTable.id, data.id))
      .returning();
    return NextResponse.json(payment);
  } catch (error) {
    console.error("Database error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
