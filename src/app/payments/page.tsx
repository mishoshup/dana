"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const payments = [
  { name: "SPayLater", amount: 826.56, date: "2026-06-01", status: "pending" },
  { name: "Car Loan", amount: 538.00, date: "2026-06-05", status: "pending" },
  { name: "Rent", amount: 550.00, date: "2026-06-07", status: "pending" },
  { name: "S-Financing I", amount: 373.53, date: "2026-06-12", status: "pending" },
  { name: "MARA", amount: 100.00, date: "2026-06-26", status: "pending" },
  { name: "Telco", amount: 110.00, date: "2026-06-15", status: "pending" },
  { name: "Claude Code", amount: 78.40, date: "2026-06-01", status: "pending" },
  { name: "OpenCode", amount: 39.20, date: "2026-06-01", status: "pending" },
  { name: "Netflix", amount: 15.75, date: "2026-06-15", status: "pending" },
  { name: "Spotify", amount: 5.15, date: "2026-06-15", status: "pending" },
];

export default function PaymentsPage() {
  const getStatusBadge = (status: string) => {
    const styles = {
      paid: "bg-green-500/10 text-green-400 border-green-500/20",
      pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      late: "bg-red-500/10 text-red-400 border-red-500/20",
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const totalDue = payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="p-4 md:p-8 pt-20 md:pt-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Payment Calendar</h2>
          <p className="text-zinc-500 text-sm mt-1">{payments.length} payments this month</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Total Due</p>
          <p className="text-xl font-bold text-red-400">RM{totalDue.toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-2">
        {payments.map((p) => (
          <Card key={p.name} className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm text-white font-medium">{p.name}</p>
                    <p className="text-xs text-zinc-500">Due {new Date(p.date).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white">RM{p.amount.toFixed(2)}</span>
                  <Badge variant="outline" className={`text-xs ${getStatusBadge(p.status)}`}>
                    {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
