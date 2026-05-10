"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarDays, Download } from "lucide-react";

interface Payment {
  id: string;
  debtId: string | null;
  dueDate: string;
  amount: number;
  status: "pending" | "paid" | "late";
  paidDate: string | null;
  notes: string | null;
  debt: { type: string } | null;
}

const statusStyles: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  late: "bg-red-500/10 text-red-400 border-red-500/20",
};

const debtDotColors: Record<string, string> = {
  SPayLater: "bg-red-500",
  "S-Financing I": "bg-orange-500",
  "Car Loan": "bg-yellow-500",
  MARA: "bg-green-500",
};

function getDebtDot(debtType: string | null) {
  const color = debtDotColors[debtType ?? ""];
  if (!color) return null;
  return <span className={`inline-block w-2 h-2 rounded-full ${color} mr-1.5`} />;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPayments() {
      try {
        const r = await fetch("/api/payments");
        if (!r.ok) throw new Error("Failed to fetch");
        const data: Payment[] = await r.json();
        setPayments(data);
      } catch {
        setError("Could not load payments");
      } finally {
        setLoading(false);
      }
    }
    loadPayments();
  }, []);

  // Group by month
  const byMonth: Record<string, Payment[]> = {};
  for (const p of payments) {
    const monthKey = p.dueDate.slice(0, 7); // "2026-06"
    if (!byMonth[monthKey]) byMonth[monthKey] = [];
    byMonth[monthKey].push(p);
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 pt-20 md:pt-8 max-w-4xl mx-auto flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-zinc-500" size={24} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 pt-20 md:pt-8 max-w-4xl mx-auto">
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4 text-red-400 text-sm">{error}</CardContent>
        </Card>
      </div>
    );
  }

  const pendingTotal = payments
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="p-4 md:p-8 pt-20 md:pt-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Payment Calendar</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {payments.filter((p) => p.status === "pending").length} upcoming ·{" "}
            {payments.filter((p) => p.status === "paid").length} paid
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/export?type=payments"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
          >
            <Download size={12} />
            Export CSV
          </a>
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Pending Total</p>
            <p className="text-lg font-bold text-red-400">RM{pendingTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Monthly groups */}
      {Object.keys(byMonth).length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-8 text-center">
            <CalendarDays size={32} className="text-zinc-500 mx-auto mb-2" />
            <p className="text-white font-medium">No payments scheduled</p>
            <p className="text-xs text-zinc-500 mt-1">Payments will appear here once debts are created.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(byMonth)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([monthKey, monthPayments]) => {
            const [year, month] = monthKey.split("-");
            const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-MY", {
              month: "long",
              year: "numeric",
            });
            const monthTotal = monthPayments.reduce((s, p) => s + p.amount, 0);
            const monthPaid = monthPayments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);

            return (
              <div key={monthKey} className="mb-6">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-sm font-medium text-zinc-300">{monthName}</h3>
                  <span className="text-xs text-zinc-500">
                    {monthPaid > 0 ? `RM${monthPaid.toLocaleString()} paid · ` : ""}
                    RM{monthTotal.toLocaleString()} total
                  </span>
                </div>
                <div className="space-y-2">
                  {monthPayments
                    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                    .map((p) => {
                      const dayNum = new Date(p.dueDate).getDate();
                      const dayName = new Date(p.dueDate).toLocaleDateString("en-MY", { weekday: "short" });

                      return (
                        <Card
                          key={p.id}
                          className={`bg-zinc-900/50 border-zinc-800 ${
                            p.status === "paid" ? "opacity-50" : ""
                          }`}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            {/* Date pill */}
                            <div className="flex flex-col items-center w-10 shrink-0">
                              <span className="text-xs text-zinc-500 uppercase">{dayName}</span>
                              <span className="text-lg font-bold text-white leading-none">{dayNum}</span>
                            </div>

                            {/* Divider */}
                            <div className="w-px h-10 bg-zinc-800" />

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                {getDebtDot(p.debt?.type ?? null)}
                                <span className="text-sm font-medium text-white truncate">
                                  {p.debt?.type ?? "General Payment"}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-500 mt-0.5">
                                {p.dueDate
                                  ? new Date(p.dueDate).toLocaleDateString("en-MY", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : ""}
                                {p.paidDate && ` · Paid ${new Date(p.paidDate).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}`}
                                {p.notes && ` · ${p.notes}`}
                              </p>
                            </div>

                            {/* Amount + status */}
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-white">RM{p.amount.toLocaleString()}</p>
                              <Badge
                                variant="outline"
                                className={`text-[10px] mt-0.5 ${statusStyles[p.status] || statusStyles.pending}`}
                              >
                                {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </div>
            );
          })
      )}
    </div>
  );
}
