import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/unified";
import { monthlyDashboard, grabEntry as grabEntryTable, paymentCalendar as paymentCalendarTable, debt as debtTable, subscription } from "@/db/schema";
import { eq, and, gte, lte, lt, asc, desc, count, sum } from "drizzle-orm";
import { requireAuthTuple } from "@/lib/auth-helpers";
import { z } from "zod";

const dashboardQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).default(new Date().getMonth() + 1),
  year: z.coerce.number().int().min(2020).max(2100).default(new Date().getFullYear()),
});

export async function GET(req: NextRequest) {
  const [authError] = await requireAuthTuple();
  if (authError) return authError;

  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);

    const parsed = dashboardQuerySchema.safeParse({
      month: searchParams.get("month"),
      year: searchParams.get("year"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { month, year } = parsed.data;

    // Date range for the requested month
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const nextMonthStart = new Date(year, month, 1);

    const monthStartStr = monthStart.toISOString();
    const monthEndStr = monthEnd.toISOString();
    const nextMonthStartStr = nextMonthStart.toISOString();

    // ── MonthlyDashboard entry (salary, freelance, estimates) ─────────
    const dashboardEntries = await db.select()
      .from(monthlyDashboard)
      .where(and(
        gte(monthlyDashboard.month, monthStartStr),
        lt(monthlyDashboard.month, nextMonthStartStr),
      ))
      .limit(1)
      .all();
    const dashboardEntry = dashboardEntries[0];

    const salary = dashboardEntry?.salary ? Number(dashboardEntry.salary) : 0;
    const freelanceIncome = dashboardEntry?.freelanceIncome ? Number(dashboardEntry.freelanceIncome) : 0;

    // ── Grab entries for this month ──────────────────────────────────
    const grabEntries = await db.select()
      .from(grabEntryTable)
      .where(and(
        gte(grabEntryTable.date, monthStartStr),
        lte(grabEntryTable.date, monthEndStr),
      ))
      .all();

    const grabIncome = grabEntries.reduce(
      (gsum, g) => gsum + Number(g.net ?? g.gross),
      0
    );
    const grabsThisMonth = grabEntries.length;

    // ── PaymentCalendar entries due this month ────────────────────────
    const monthPayments = await db.select({
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
      .where(and(
        gte(paymentCalendarTable.dueDate, monthStartStr),
        lte(paymentCalendarTable.dueDate, monthEndStr),
      ))
      .orderBy(asc(paymentCalendarTable.dueDate))
      .all();

    const debtPayments = monthPayments.reduce(
      (psum, p) => psum + Number(p.amount),
      0
    );

    // ── Active subscriptions total ───────────────────────────────────
    const subscriptions = await db.select()
      .from(subscription)
      .where(eq(subscription.active, true))
      .all();
    const subscriptionsTotal = subscriptions.reduce(
      (ssum, s) => ssum + Number(s.cost),
      0
    );

    // ── Estimated costs (food, fuel, tolls, grab costs) ──────────────
    const estimatedCosts = dashboardEntry
      ? Number(dashboardEntry.food ?? 0) +
        Number(dashboardEntry.fuelTolls ?? 0) +
        Number(dashboardEntry.grabCosts ?? 0)
      : 850; // Default fallback if no dashboard entry

    // ── Aggregates ───────────────────────────────────────────────────
    const totalIncome = salary + grabIncome + freelanceIncome;
    const totalExpenses = debtPayments + subscriptionsTotal + estimatedCosts;
    const surplus = totalIncome - totalExpenses;

    // ── Active debts with this month's payments ──────────────────────
    const activeDebts = await db.select()
      .from(debtTable)
      .where(eq(debtTable.status, "active"))
      .all();

    // Get this month's payments for active debts (separate query)
    const activeDebtIds = activeDebts.map((d) => d.id);
    const activeDebtPayments = activeDebtIds.length > 0
      ? await db.select()
          .from(paymentCalendarTable)
          .where(and(
            gte(paymentCalendarTable.dueDate, monthStartStr),
            lte(paymentCalendarTable.dueDate, monthEndStr),
          ))
          .all()
      : [];

    // Group by debtId
    const paymentsByDebtId: Record<string, typeof activeDebtPayments> = {};
    for (const p of activeDebtPayments) {
      const key = p.debtId!;
      if (!paymentsByDebtId[key]) paymentsByDebtId[key] = [];
      paymentsByDebtId[key].push(p);
    }

    const debts = activeDebts.map((d) => ({
      id: d.id,
      type: d.type,
      balance: Number(d.balance),
      monthlyPayment: Number(d.monthlyPayment),
      paid: (paymentsByDebtId[d.id] || []).reduce((ps, p) => ps + Number(p.amount), 0),
      endDate: d.endDate,
    }));

    // ── Upcoming pending payments (next 5) ───────────────────────────
    const upcomingPayments = monthPayments
      .filter((p) => p.status === "pending")
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        amount: p.amount,
        dueDate: p.dueDate,
        status: p.status,
        debt: p.debt,
      }));

    return NextResponse.json({
      salary,
      grabIncome,
      freelanceIncome,
      totalIncome,
      debtPayments,
      subscriptions: subscriptionsTotal,
      estimatedCosts,
      totalExpenses,
      surplus,
      grabsThisMonth,
      debts,
      upcomingPayments,
    });
  } catch (error) {
    console.error("Dashboard database error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
