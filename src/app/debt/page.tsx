"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const debts = [
  { name: "SPayLater", balance: 5057, monthly: 388, rate: "1.5%/mo", end: "Mar 2028", color: "#ef4444" },
  { name: "S-Financing I", balance: 2988, monthly: 373.53, rate: "Fixed", end: "Jan 2027", color: "#f97316" },
  { name: "Car Loan", balance: 80000, monthly: 538, rate: "3.5%", end: "2034", color: "#eab308" },
  { name: "MARA", balance: 1200, monthly: 100, rate: "0%", end: "2027", color: "#22c55e" },
];

export default function DebtPage() {
  return (
    <div className="p-4 md:p-8 pt-20 md:pt-8 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Debt Schedule</h2>

      <div className="grid gap-4 mb-8">
        {debts.map((debt) => (
          <Card key={debt.name} className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-medium">{debt.name}</h3>
                <Badge variant="outline" className="text-xs" style={{ borderColor: `${debt.color}30`, color: debt.color }}>
                  {debt.end}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-zinc-500 text-xs">Balance</p>
                  <p className="text-white font-semibold">RM{debt.balance.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">Monthly</p>
                  <p className="text-white font-semibold">RM{debt.monthly.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">Rate</p>
                  <p className="text-white font-semibold">{debt.rate}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm text-white">Debt Distribution</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={debts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis type="number" stroke="#71717a" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={12} width={100} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px" }} />
              <Bar dataKey="balance" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
