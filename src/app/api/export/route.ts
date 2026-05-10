import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthTuple } from "@/lib/auth-helpers";

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = rows.map((row) =>
    headers
      .map((h) => {
        const val = row[h];
        if (val == null) return "";
        const str = String(val);
        // Quote if contains comma, quote, or newline
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(",")
  );
  return [headers.join(","), ...lines].join("\n");
}

export async function GET(req: NextRequest) {
  const [authError] = await requireAuthTuple();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  try {
    switch (type) {
      case "debts": {
        const debts = await prisma.debt.findMany({
          orderBy: { createdAt: "desc" },
          select: {
            type: true,
            balance: true,
            monthlyPayment: true,
            interestRate: true,
            status: true,
            startDate: true,
            endDate: true,
            notes: true,
          },
        });
        const rows = debts.map((d) => ({
          type: d.type,
          balance: d.balance,
          monthlyPayment: d.monthlyPayment,
          interestRate: d.interestRate,
          status: d.status,
          startDate: d.startDate.toISOString().split("T")[0],
          endDate: d.endDate ? d.endDate.toISOString().split("T")[0] : "",
          notes: d.notes ?? "",
        }));
        const csv = toCSV(rows);
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": 'attachment; filename="debts.csv"',
          },
        });
      }

      case "payments": {
        const payments = await prisma.paymentCalendar.findMany({
          orderBy: { dueDate: "desc" },
          select: {
            dueDate: true,
            amount: true,
            status: true,
            paidDate: true,
            notes: true,
            debt: { select: { type: true } },
          },
        });
        const rows = payments.map((p) => ({
          debtType: p.debt?.type ?? "",
          amount: p.amount,
          dueDate: p.dueDate.toISOString().split("T")[0],
          status: p.status,
          paidDate: p.paidDate ? p.paidDate.toISOString().split("T")[0] : "",
          notes: p.notes ?? "",
        }));
        const csv = toCSV(rows);
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": 'attachment; filename="payments.csv"',
          },
        });
      }

      case "grab": {
        const entries = await prisma.grabEntry.findMany({
          orderBy: { date: "desc" },
          select: {
            date: true,
            platform: true,
            hours: true,
            gross: true,
            commission: true,
            fuel: true,
            tolls: true,
            net: true,
            notes: true,
          },
        });
        const rows = entries.map((e) => ({
          date: e.date.toISOString().split("T")[0],
          platform: e.platform,
          hours: e.hours,
          gross: e.gross,
          commission: e.commission ?? "",
          fuel: e.fuel ?? "",
          tolls: e.tolls ?? "",
          net: e.net ?? "",
          notes: e.notes ?? "",
        }));
        const csv = toCSV(rows);
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": 'attachment; filename="grab.csv"',
          },
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid type. Use ?type=debts|payments|grab" },
          { status: 400 }
        );
    }
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
