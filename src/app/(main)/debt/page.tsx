"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertTriangle, CreditCard, TrendingDown,
  ArrowRight, CheckCircle2, Loader2, Download,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Debt {
  id: string;
  type: string;
  balance: number;
  monthlyPayment: number;
  interestRate: number | null;
  startDate: string;
  endDate: string | null;
  status: string;
  payments: Payment[];
}

interface Payment {
  id: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: string;
}

const debtColors: Record<string, string> = {
  SPayLater: "border-red-500/30 bg-red-500/5",
  "S-Financing I": "border-orange-500/30 bg-orange-500/5",
  "Car Loan": "border-yellow-500/30 bg-yellow-500/5",
  MARA: "border-green-500/30 bg-green-500/5",
};

const debtTextColors: Record<string, string> = {
  SPayLater: "text-red-400",
  "S-Financing I": "text-orange-400",
  "Car Loan": "text-yellow-400",
  MARA: "text-green-400",
};

export default function DebtTracker() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payDialog, setPayDialog] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);
  const [extraPayment, setExtraPayment] = useState<string>("");
  const [view, setView] = useState<"list" | "snowball">("list");

  useEffect(() => {
    fetchDebts();
  }, []);

  async function fetchDebts() {
    try {
      setLoading(true);
      const res = await fetch("/api/debt");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setDebts(data);
    } catch (e) {
      setError("Failed to load debts");
    } finally {
      setLoading(false);
    }
  }

  async function handlePay(debtId: string) {
    if (!payAmount || parseFloat(payAmount) <= 0) return;
    setPaying(true);
    setPaySuccess(null);

    try {
      const res = await fetch(`/api/debt/${debtId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: payAmount, date: payDate }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Payment failed");
      }

      const result = await res.json();
      setPaySuccess(
        result.fullyPaid
          ? "🎉 Debt fully paid off!"
          : `✅ Paid RM${payAmount}. RM${result.remaining.toLocaleString()} remaining.`
      );
      setPayDialog(null);
      setPayAmount("");
      fetchDebts();

      setTimeout(() => setPaySuccess(null), 4000);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Payment failed";
      setPaySuccess(`❌ ${message}`);
    } finally {
      setPaying(false);
    }
  }

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMonthly = debts.reduce((s, d) => s + d.monthlyPayment, 0);
  const activeDebts = debts.filter((d) => d.status === "active");
  const paidDebts = debts.filter((d) => d.status === "paid");
  const paidThisMonth = debts
    .flatMap((d) => d.payments)
    .filter((p) => {
      if (p.status !== "paid") return false;
      const d = new Date(p.paidDate || p.dueDate);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, p) => s + p.amount, 0);

  // Snowball order: smallest balance first
  const snowballDebts = [...activeDebts].sort((a, b) => a.balance - b.balance);
  const displayDebts = view === "snowball" ? snowballDebts : activeDebts;

  // Projection
  const extraPerMonth = parseFloat(extraPayment) || 0;
  function projectClearance(debt: Debt): { months: number; date: string } {
    const monthly = debt.monthlyPayment + extraPerMonth;
    if (monthly <= 0) return { months: 999, date: "∞" };
    const months = Math.ceil(debt.balance / monthly);
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return {
      months,
      date: d.toLocaleDateString("en-MY", { month: "short", year: "numeric" }),
    };
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

  return (
    <div className="p-4 md:p-8 pt-20 md:pt-8 max-w-4xl mx-auto w-full">
      {/* Payment success toast */}
      {paySuccess && (
        <div className="fixed top-4 right-4 z-50 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm shadow-lg animate-in">
          {paySuccess}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Debt Tracker</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {activeDebts.length} active · {paidDebts.length} paid
          </p>
        </div>
        <a
          href="/api/export?type=debts"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
        >
          <Download size={12} />
          Export CSV
        </a>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Total Debt</p>
            <p className="text-lg font-bold text-red-400">RM{totalDebt.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Monthly</p>
            <p className="text-lg font-bold text-white">RM{totalMonthly.toLocaleString()}/mo</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Paid This Month</p>
            <p className="text-lg font-bold text-emerald-400">RM{paidThisMonth.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Freedom Countdown</p>
            <p className="text-lg font-bold text-blue-400">
              {activeDebts.length > 0
                ? `${projectClearance(activeDebts.reduce((max, d) =>
                    projectClearance(d).months > projectClearance(max).months ? d : max
                  )).months} months`
                : "🎉 Free!"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Danger zone for June-July peak */}
      <Card className="bg-red-500/10 border-red-500/30 mb-6">
        <CardContent className="p-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <div>
            <p className="text-sm text-red-400 font-medium">Peak Debt Period</p>
            <p className="text-xs text-red-400/70">June-July 2026 — RM2,674/mo commitments. Stay disciplined.</p>
          </div>
        </CardContent>
      </Card>

      {/* View toggle + extra payment projection */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          size="sm"
          variant={view === "list" ? "default" : "outline"}
          onClick={() => setView("list")}
          className={view === "list" ? "bg-zinc-800" : "bg-transparent border-zinc-800 text-zinc-400"}
        >
          <CreditCard size={14} className="mr-1.5" /> By Priority
        </Button>
        <Button
          size="sm"
          variant={view === "snowball" ? "default" : "outline"}
          onClick={() => setView("snowball")}
          className={view === "snowball" ? "bg-zinc-800" : "bg-transparent border-zinc-800 text-zinc-400"}
        >
          <TrendingDown size={14} className="mr-1.5" /> Snowball
        </Button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Extra RM/mo"
            value={extraPayment}
            onChange={(e) => setExtraPayment(e.target.value)}
            className="w-24 h-8 text-xs bg-zinc-900 border-zinc-800 text-white"
          />
          <span className="text-[10px] text-zinc-500">Project</span>
        </div>
      </div>

      {/* Debt Cards */}
      {displayDebts.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-8 text-center">
            <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-white font-medium">No active debts 🎉</p>
            <p className="text-xs text-zinc-500 mt-1">You're debt free!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 mb-8">
          {displayDebts.map((debt) => {
            const pct = debt.balance === 0
              ? 100
              : Math.min(100, ((debt.payments?.reduce((s, p) => s + p.amount, 0) || 0) /
                  (debt.balance + (debt.payments?.reduce((s, p) => s + p.amount, 0) || 0))) * 100);
            const projection = projectClearance(debt);

            return (
              <Card
                key={debt.id}
                className={`${debtColors[debt.type] || "border-zinc-800 bg-zinc-900/50"} ${
                  debt.status === "paid" ? "opacity-50" : ""
                }`}
              >
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{debt.type}</span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${debt.status === "paid" ? "text-emerald-400 border-emerald-500/30" : debtTextColors[debt.type] || "text-zinc-400"} border-current`}
                      >
                        {debt.status === "paid" ? "Paid" : debt.status}
                      </Badge>
                    </div>
                    <span className="text-base font-bold text-white">
                      RM{debt.balance.toLocaleString()}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        debt.status === "paid"
                          ? "bg-emerald-500"
                          : debt.type === "SPayLater"
                          ? "bg-red-500"
                          : debt.type === "S-Financing I"
                          ? "bg-orange-500"
                          : debt.type === "Car Loan"
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-3 gap-2 text-[11px] mb-3">
                    <div className="text-zinc-500">
                      Monthly <span className="text-white ml-1">RM{debt.monthlyPayment.toLocaleString()}</span>
                    </div>
                    <div className="text-zinc-500">
                      Rate <span className="text-white ml-1">{debt.interestRate || "-"}</span>
                    </div>
                    <div className="text-zinc-500">
                      Est. clear{" "}
                      <span className={`ml-1 ${extraPerMonth > 0 ? "text-emerald-400" : "text-white"}`}>
                        {projection.date}
                      </span>
                    </div>
                  </div>

                  {/* Extra payment projection */}
                  {extraPerMonth > 0 && (
                    <div className="text-[10px] text-emerald-400 mb-3 flex items-center gap-1">
                      <ArrowRight size={10} />
                      RM{extraPerMonth}/mo extra → clears {projection.months}mo (
                      {projection.date})
                    </div>
                  )}

                  {/* Action */}
                  <div className="flex gap-2">
                    <Dialog
                      open={payDialog === debt.id}
                      onOpenChange={(open) => {
                        setPayDialog(open ? debt.id : null);
                        if (!open) setPayAmount("");
                      }}
                    >
                      <DialogTrigger className="flex-1">
                        <Button
                          size="sm"
                          disabled={debt.status === "paid"}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-8 text-xs"
                        >
                          <CreditCard size={12} className="mr-1.5" /> Log Payment
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-zinc-950 border-zinc-800 text-white w-[95vw] max-w-sm rounded-xl">
                        <DialogHeader>
                          <DialogTitle className="text-white text-sm">
                            Pay {debt.type}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs text-zinc-500 mb-1">
                              Remaining: <span className="text-white font-medium">RM{debt.balance.toLocaleString()}</span>
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Amount (RM)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              max={debt.balance}
                              value={payAmount}
                              onChange={(e) => setPayAmount(e.target.value)}
                              placeholder={`Max: RM${debt.balance.toLocaleString()}`}
                              className="bg-zinc-900 border-zinc-800 text-white h-10"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Date</Label>
                            <Input
                              type="date"
                              value={payDate}
                              onChange={(e) => setPayDate(e.target.value)}
                              className="bg-zinc-900 border-zinc-800 text-white h-10"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setPayDialog(null);
                                setPayAmount("");
                              }}
                              className="flex-1 bg-zinc-900 border-zinc-800 text-white h-10"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => handlePay(debt.id)}
                              disabled={!payAmount || parseFloat(payAmount) <= 0 || paying}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-10"
                            >
                              {paying ? (
                                <Loader2 size={14} className="animate-spin mr-1" />
                              ) : null}
                              {paying ? "Processing..." : "Pay Now"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Recent payments */}
                  {debt.payments && debt.payments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-zinc-800">
                      <p className="text-[10px] text-zinc-600 mb-1.5">Recent payments</p>
                      {debt.payments.slice(0, 3).map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-[11px] py-0.5">
                          <span className="text-zinc-400">
                            {new Date(p.paidDate || p.dueDate).toLocaleDateString("en-MY", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                          <span className="text-white">RM{p.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Debt Distribution Chart */}
      {debts.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm text-white">Debt Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={debts} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis type="number" stroke="#71717a" fontSize={11} />
                <YAxis dataKey="type" type="category" stroke="#71717a" fontSize={11} width={90} />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value, name) => [`RM${Number(value).toLocaleString()}`, "Balance"]}
                />
                <Bar dataKey="balance" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
