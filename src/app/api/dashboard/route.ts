import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
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

    // ── MonthlyDashboard entry (salary, freelance, estimates) ─────────
    const dashboardEntry = await prisma.monthlyDashboard.findFirst({
      where: {
        month: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
    });

    const salary = dashboardEntry?.salary ?? 0;
    const freelanceIncome = dashboardEntry?.freelanceIncome ?? 0;

    // ── Grab entries for this month ──────────────────────────────────
    const grabEntries = await prisma.grabEntry.findMany({
      where: {
        date: { gte: monthStart, lte: monthEnd },
      },
    });

    const grabIncome = grabEntries.reduce(
      (sum, g) => sum + (g.net ?? g.gross),
      0
    );
    const grabsThisMonth = grabEntries.length;

    // ── PaymentCalendar entries due this month ────────────────────────
    const monthPayments = await prisma.paymentCalendar.findMany({
      where: {
        dueDate: { gte: monthStart, lte: monthEnd },
      },
      orderBy: { dueDate: "asc" },
      include: {
        debt: { select: { type: true } },
      },
    });

    const debtPayments = monthPayments.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    // ── Active subscriptions total ───────────────────────────────────
    const subscriptions = await prisma.subscription.findMany({
      where: { active: true },
    });
    const subscriptionsTotal = subscriptions.reduce(
      (sum, s) => sum + s.cost,
      0
    );

    // ── Estimated costs (food, fuel, tolls, grab costs) ──────────────
    const estimatedCosts = dashboardEntry
      ? (dashboardEntry.food ?? 0) +
        (dashboardEntry.fuelTolls ?? 0) +
        (dashboardEntry.grabCosts ?? 0)
      : 850; // Default fallback if no dashboard entry

    // ── Aggregates ───────────────────────────────────────────────────
    const totalIncome = salary + grabIncome + freelanceIncome;
    const totalExpenses = debtPayments + subscriptionsTotal + estimatedCosts;
    const surplus = totalIncome - totalExpenses;

    // ── Active debts with this month's payments ──────────────────────
    const activeDebts = await prisma.debt.findMany({
      where: { status: "active" },
      include: {
        payments: {
          where: {
            dueDate: { gte: monthStart, lte: monthEnd },
          },
        },
      },
    });

    const debts = activeDebts.map((d) => ({
      type: d.type,
      balance: d.balance,
      monthlyPayment: d.monthlyPayment,
      paid: d.payments.reduce((sum, p) => sum + p.amount, 0),
      endDate: d.endDate,
    }));

    // ── Upcoming pending payments (next 5) ───────────────────────────
    const upcomingPayments = monthPayments
      .filter((p) => p.status === "pending")
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        amount: p.amount,
        dueDate: p.dueDate.toISOString(),
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
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
