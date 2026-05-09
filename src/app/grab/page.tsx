"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Plus } from "lucide-react";

const platforms = [
  { name: "Grab", color: "#22c55e" },
  { name: "Bolt", color: "#3b82f6" },
  { name: "inDrive", color: "#f97316" },
];

const weekData = [
  { day: "Mon", earnings: 85 },
  { day: "Tue", earnings: 92 },
  { day: "Wed", earnings: 78 },
  { day: "Thu", earnings: 105 },
  { day: "Fri", earnings: 120 },
  { day: "Sat", earnings: 150 },
  { day: "Sun", earnings: 95 },
];

export default function GrabPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="p-4 md:p-8 pt-20 md:pt-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Grab Tracker</h2>
          <p className="text-zinc-500 text-sm mt-1">Track your e-hailing earnings</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700">
          <Plus size={16} className="mr-2" /> Log Ride
        </Button>
      </div>

      {showForm && (
        <Card className="bg-zinc-900/50 border-zinc-800 mb-6">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm text-white">New Grab Entry</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <form className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Date</Label>
                <Input type="date" className="bg-zinc-950 border-zinc-800 text-white h-9" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Platform</Label>
                <select className="w-full h-9 px-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm">
                  {platforms.map((p) => <option key={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Hours</Label>
                <Input type="number" step="0.5" className="bg-zinc-950 border-zinc-800 text-white h-9" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Gross (RM)</Label>
                <Input type="number" step="0.01" className="bg-zinc-950 border-zinc-800 text-white h-9" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Fuel (RM)</Label>
                <Input type="number" step="0.01" className="bg-zinc-950 border-zinc-800 text-white h-9" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Net (RM)</Label>
                <Input type="number" step="0.01" className="bg-zinc-950 border-zinc-800 text-white h-9" />
              </div>
              <div className="col-span-2">
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                  Save Entry
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "This Week", value: "RM725", sub: "+12% vs last week", color: "text-green-400" },
          { label: "This Month", value: "RM1,250", sub: "25 days active", color: "text-blue-400" },
          { label: "Avg/Day", value: "RM50", sub: "5.2 hrs/day", color: "text-white" },
        ].map((s) => (
          <Card key={s.label} className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-3">
              <p className="text-xs text-zinc-500">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-zinc-600">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm text-white">This Week</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="day" stroke="#71717a" fontSize={12} />
              <YAxis stroke="#71717a" fontSize={12} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px" }} />
              <Bar dataKey="earnings" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="flex gap-2 mt-4">
        {platforms.map((p) => (
          <Badge key={p.name} variant="outline" className="text-xs" style={{ borderColor: `${p.color}30`, color: p.color }}>
            {p.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}
