"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Car, DollarSign, TrendingDown, Calendar } from "lucide-react";

interface DashboardData {
  salary: number;
  grabIncome: number;
  freelanceIncome: number;
  totalIncome: number;
  debtPayments: number;
  subscriptions: number;
  estimatedCosts: number;
  totalExpenses: number;
  surplus: number;
  grabsThisMonth: number;
  debts: DebtSummary[];
  upcomingPayments: UpcomingPayment[];
}

interface DebtSummary {
  id: string;
  type: string;
  balance: number;
  monthlyPayment: number;
  paid: number;
  endDate: string | null;
}

interface UpcomingPayment {
  id: string;
  amount: number;
  dueDate: string;
  status: string;
  debt: { type: string } | null;
}

const colorMap: Record<string, string> = {
  SPayLater: "border-red-500/30 bg-red-500/5",
  "S-Financing I": "border-orange-500/30 bg-orange-500/5",
  "Car Loan": "border-yellow-500/30 bg-yellow-500/5",
  MARA: "border-green-500/30 bg-green-500/5",
};

const textMap: Record<string, string> = {
  SPayLater: "text-red-400",
  "S-Financing I": "text-orange-400",
  "Car Loan": "text-yellow-400",
  MARA: "text-green-400",
};

const progressColor: Record<string, string> = {
  SPayLater: "bg-red-500",
  "S-Financing I": "bg-orange-500",
  "Car Loan": "bg-yellow-500",
  MARA: "bg-green-500",
};

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthLabel = `${monthNames[currentMonth]} ${currentYear}`;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const month = currentMonth + 1;
        const year = currentYear;

        const res = await fetch(`/api/dashboard?month=${month}&year=${year}`);
        if (!res.ok) throw new Error("Failed to load dashboard data");

        const dashboardData: DashboardData = await res.json();
        setData(dashboardData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [currentMonth, currentYear]);

  // Compute derived values from dashboard data
  const totalDebt = data?.debts.reduce((s, d) => s + d.balance, 0) ?? 0;
  const activeDebts = data?.debts ?? [];
  const monthlyCommitments = data?.debtPayments ?? 0;
  const surplus = data?.surplus ?? 0;
  const totalIncome = data?.totalIncome ?? 0;
  const upcomingPayments = data?.upcomingPayments ?? [];
  const estimatedCostsLabel = data?.estimatedCosts ?? 0;

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

  return (
    <div className="p-4 md:p-8 pt-20 md:pt-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Dana</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          {monthLabel} — Personal Finance OS
        </p>
      </div>

      {/* Quick Summary */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Income</p>
            <p className="text-base font-bold text-white">
              RM{totalIncome.toLocaleString()}
            </p>
            <p className="text-[10px] text-zinc-600">Salary + Grab</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Debt</p>
            <p className="text-base font-bold text-red-400">
              RM{totalDebt.toLocaleString()}
            </p>
            <p className="text-[10px] text-zinc-600">{activeDebts.length} active</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">This Month</p>
            <p
              className={`text-base font-bold ${surplus >= 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              RM{surplus.toLocaleString()}
            </p>
            <p className="text-[10px] text-zinc-600">Surplus</p>
          </CardContent>
        </Card>
      </div>

      {/* Debt Tracker */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingDown size={14} className="text-red-400" /> Debt Tracker
          </h3>
          <Badge variant="outline" className="text-[10px] bg-zinc-900 text-zinc-400 border-zinc-700">
            RM{monthlyCommitments.toLocaleString()}/mo
          </Badge>
        </div>

        <div className="space-y-2">
          {activeDebts.length === 0 ? (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4 text-center text-sm text-zinc-500">
                No active debts — you&apos;re debt free! 🎉
              </CardContent>
            </Card>
          ) : (
            activeDebts.map((d) => {
              const totalPaid = d.paid;
              const totalOriginal = d.balance + totalPaid;
              const pct = totalOriginal > 0 ? (totalPaid / totalOriginal) * 100 : 0;
              const debtColorKey = d.type;

              return (
                <div
                  key={d.id}
                  className={`rounded-xl border ${colorMap[debtColorKey] || "border-zinc-800 bg-zinc-900/50"} p-3`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white">{d.type}</span>
                    </div>
                    <span className="text-sm font-bold text-white">
                      RM{d.balance.toLocaleString()}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full ${progressColor[debtColorKey] || "bg-blue-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-zinc-500">
                      RM{d.monthlyPayment.toLocaleString()}/mo
                    </span>
                    <span className="text-zinc-500">
                      Clear:{" "}
                      {d.endDate
                        ? new Date(d.endDate).toLocaleDateString("en-MY", {
                            month: "short",
                            year: "numeric",
                          })
                        : "N/A"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Expenses Breakdown */}
      <Card className="bg-zinc-900/50 border-zinc-800 mb-6">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <TrendingDown size={14} className="text-orange-400" /> Monthly Expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          <div className="divide-y divide-zinc-800/50">
            <div className="flex items-center justify-between py-2.5 first:pt-0">
              <p className="text-sm text-zinc-300">Debt Payments</p>
              <span className="text-sm font-medium text-white">
                RM{data?.debtPayments.toFixed(2) ?? "0.00"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <p className="text-sm text-zinc-300">Subscriptions</p>
              <span className="text-sm font-medium text-white">
                RM{data?.subscriptions.toFixed(2) ?? "0.00"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <p className="text-sm text-zinc-300">
                Estimated Costs (food, fuel, tolls)
                <span className="text-[10px] text-zinc-600 ml-1">*</span>
              </p>
              <span className="text-sm font-medium text-amber-400">
                RM{data?.estimatedCosts.toFixed(2) ?? "0.00"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <p className="text-sm font-medium text-white">Total Expenses</p>
              <span className="text-sm font-bold text-white">
                RM{data?.totalExpenses.toFixed(2) ?? "0.00"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <p className="text-sm font-medium text-white">Surplus</p>
              <span
                className={`text-sm font-bold ${(data?.surplus ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                RM{data?.surplus.toFixed(2) ?? "0.00"}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-zinc-600 mt-2 italic">
            * Estimated costs are user-defined defaults until set in Monthly Dashboard settings.
          </p>
        </CardContent>
      </Card>

      {/* Upcoming Payments */}
      <Card className="bg-zinc-900/50 border-zinc-800 mb-6">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Calendar size={14} className="text-blue-400" /> Upcoming Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          {upcomingPayments.length === 0 ? (
            <p className="text-sm text-zinc-500 py-2">No pending payments</p>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {upcomingPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm text-white">
                      {p.debt?.type ?? "General Payment"}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      Due{" "}
                      {new Date(p.dueDate).toLocaleDateString("en-MY", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      RM{p.amount.toFixed(2)}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    >
                      Pending
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => router.push("/grab")}
          variant="outline"
          className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-white rounded-xl h-11"
        >
          <Car size={16} className="mr-2" /> Log Grab
        </Button>
        <Button
          onClick={() => router.push("/payments")}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11"
        >
          <DollarSign size={16} className="mr-2" /> Mark Paid
        </Button>
      </div>
    </div>
  );
}
