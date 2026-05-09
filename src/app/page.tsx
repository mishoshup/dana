"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, DollarSign, AlertTriangle, TrendingDown, Calendar } from "lucide-react";

const debts = [
  { name: "SPayLater", balance: 5057, monthly: 826.56, totalMonths: 22, paid: 0, rate: "1.5%/mo", end: "Mar 2028", color: "red" },
  { name: "S-Financing I", balance: 2988, monthly: 373.53, totalMonths: 8, paid: 0, rate: "Fixed", end: "Jan 2027", color: "orange" },
  { name: "Car Loan", balance: 80000, monthly: 538, totalMonths: 96, paid: 0, rate: "3.5%", end: "2034", color: "yellow" },
  { name: "MARA", balance: 1200, monthly: 100, totalMonths: 12, paid: 0, rate: "0%", end: "2027", color: "green" },
];

const upcoming = [
  { name: "SPayLater", amount: 826.56, date: "Jun 1" },
  { name: "Car Loan", amount: 538.00, date: "Jun 5" },
  { name: "Rent", amount: 550.00, date: "Jun 7" },
  { name: "S-Financing I", amount: 373.53, date: "Jun 12" },
  { name: "MARA", amount: 100.00, date: "Jun 26" },
];

const colorMap: Record<string, string> = {
  red: "border-red-500/30 bg-red-500/5",
  orange: "border-orange-500/30 bg-orange-500/5",
  yellow: "border-yellow-500/30 bg-yellow-500/5",
  green: "border-green-500/30 bg-green-500/5",
};

const textMap: Record<string, string> = {
  red: "text-red-400",
  orange: "text-orange-400",
  yellow: "text-yellow-400",
  green: "text-green-400",
};

export default function Dashboard() {
  const router = useRouter();
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const monthlyCommitments = debts.reduce((s, d) => s + d.monthly, 0) + 550 + 110; // rent + telco
  const mayIncome = 3000 + 1250; // salary + grab

  return (
    <div className="p-4 md:p-8 pt-20 md:pt-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Dana</h2>
        <p className="text-xs text-zinc-500 mt-0.5">May 2026 — Personal Finance OS</p>
      </div>

      {/* Quick Summary */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Income</p>
            <p className="text-base font-bold text-white">RM{mayIncome.toLocaleString()}</p>
            <p className="text-[10px] text-zinc-600">Salary + Grab</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Debt</p>
            <p className="text-base font-bold text-red-400">RM{totalDebt.toLocaleString()}</p>
            <p className="text-[10px] text-zinc-600">4 active</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">This Month</p>
            <p className="text-base font-bold text-emerald-400">RM{mayIncome - monthlyCommitments - 450 - 300 - 100}</p>
            <p className="text-[10px] text-zinc-600">Est. surplus</p>
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
          {debts.map((d) => {
            const pct = d.paid === 0 ? 0 : (d.balance / (d.paid + d.balance)) * 100;
            return (
              <div key={d.name} className={`rounded-xl border ${colorMap[d.color]} p-3`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium text-white`}>{d.name}</span>
                    <Badge variant="outline" className={`text-[9px] ${textMap[d.color]} border-current`}>
                      {d.rate}
                    </Badge>
                  </div>
                  <span className="text-sm font-bold text-white">RM{d.balance.toLocaleString()}</span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-1.5">
                  <div className={`h-full rounded-full ${d.color === "red" ? "bg-red-500" : d.color === "orange" ? "bg-orange-500" : d.color === "yellow" ? "bg-yellow-500" : "bg-green-500"}`}
                    style={{ width: `${pct}%` }} />
                </div>

                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-500">RM{d.monthly}/mo</span>
                  <span className="text-zinc-500">Clear: {d.end}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Payments */}
      <Card className="bg-zinc-900/50 border-zinc-800 mb-6">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Calendar size={14} className="text-blue-400" /> Upcoming Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          <div className="divide-y divide-zinc-800/50">
            {upcoming.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm text-white">{p.name}</p>
                  <p className="text-[10px] text-zinc-500">Due {p.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">RM{p.amount.toFixed(2)}</span>
                  <Badge variant="outline" className="text-[9px] bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                    Pending
                  </Badge>
                </div>
              </div>
            ))}
          </div>
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
