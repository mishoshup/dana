import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/unified";
import { debt as debtTable, paymentCalendar as paymentCalendarTable, grabEntry as grabEntryTable } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
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
    const db = await getDb();
    switch (type) {
      case "debts": {
        const debts = await db.select({
          type: debtTable.type,
          balance: debtTable.balance,
          monthlyPayment: debtTable.monthlyPayment,
          interestRate: debtTable.interestRate,
          status: debtTable.status,
          startDate: debtTable.startDate,
          endDate: debtTable.endDate,
          notes: debtTable.notes,
        })
          .from(debtTable)
          .orderBy(desc(debtTable.createdAt))
          .all();
        const rows = debts.map((d) => ({
          type: d.type,
          balance: d.balance,
          monthlyPayment: d.monthlyPayment,
          interestRate: d.interestRate,
          status: d.status,
          startDate: d.startDate ? d.startDate.split("T")[0] : "",
          endDate: d.endDate ? d.endDate.split("T")[0] : "",
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
        const payments = await db.select({
          dueDate: paymentCalendarTable.dueDate,
          amount: paymentCalendarTable.amount,
          status: paymentCalendarTable.status,
          paidDate: paymentCalendarTable.paidDate,
          notes: paymentCalendarTable.notes,
          debtType: debtTable.type,
        })
          .from(paymentCalendarTable)
          .leftJoin(debtTable, eq(paymentCalendarTable.debtId, debtTable.id))
          .orderBy(desc(paymentCalendarTable.dueDate))
          .all();
        const rows = payments.map((p) => ({
          debtType: p.debtType ?? "",
          amount: p.amount,
          dueDate: p.dueDate ? p.dueDate.split("T")[0] : "",
          status: p.status,
          paidDate: p.paidDate ? p.paidDate.split("T")[0] : "",
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
        const entries = await db.select({
          date: grabEntryTable.date,
          platform: grabEntryTable.platform,
          hours: grabEntryTable.hours,
          gross: grabEntryTable.gross,
          commission: grabEntryTable.commission,
          fuel: grabEntryTable.fuel,
          tolls: grabEntryTable.tolls,
          net: grabEntryTable.net,
          notes: grabEntryTable.notes,
        })
          .from(grabEntryTable)
          .orderBy(desc(grabEntryTable.date))
          .all();
        const rows = entries.map((e) => ({
          date: e.date ? e.date.split("T")[0] : "",
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
