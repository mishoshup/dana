"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Download } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const platforms = [
  { name: "Grab", color: "#22c55e" },
  { name: "Bolt", color: "#3b82f6" },
  { name: "inDrive", color: "#f97316" },
];

interface GrabEntry {
  id: string;
  date: string;
  platform: string;
  hours: number;
  gross: number;
  commission: number | null;
  fuel: number | null;
  tolls: number | null;
  net: number | null;
}

export default function GrabPage() {
  const [entries, setEntries] = useState<GrabEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    platform: "Grab",
    hours: "",
    gross: "",
    fuel: "",
    net: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  async function fetchEntries() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/grab");
      if (!res.ok) throw new Error("Failed to fetch entries");
      const data: GrabEntry[] = await res.json();
      setEntries(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load entries");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveResult(null);

    try {
      const res = await fetch("/api/grab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err: { error?: string } = await res.json();
        throw new Error(err.error || "Failed to save entry");
      }

      setSaveResult({ type: "success", message: "Entry saved!" });
      setForm({
        date: new Date().toISOString().split("T")[0],
        platform: "Grab",
        hours: "",
        gross: "",
        fuel: "",
        net: "",
      });
      setShowForm(false);
      fetchEntries();

      setTimeout(() => setSaveResult(null), 3000);
    } catch (e) {
      setSaveResult({
        type: "error",
        message: e instanceof Error ? e.message : "Failed to save",
      });
    } finally {
      setSaving(false);
    }
  }

  // Compute stats from real data
  const thisWeekEntries = entries.filter((e) => {
    const d = new Date(e.date);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return d >= weekStart;
  });

  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const thisMonthEntries = entries.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  const weekTotal = thisWeekEntries.reduce((s, e) => s + (e.net ?? e.gross), 0);
  const monthTotal = thisMonthEntries.reduce((s, e) => s + (e.net ?? e.gross), 0);
  const monthHours = thisMonthEntries.reduce((s, e) => s + e.hours, 0);
  const avgPerDay = thisMonthEntries.length > 0 ? monthTotal / thisMonthEntries.length : 0;
  const avgHours = thisMonthEntries.length > 0 ? monthHours / thisMonthEntries.length : 0;

  // Build week data for chart
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekChartData = dayNames.map((day, idx) => {
    const dayEntries = thisWeekEntries.filter((e) => new Date(e.date).getDay() === idx);
    const earnings = dayEntries.reduce((s, e) => s + (e.net ?? e.gross), 0);
    return { day, earnings };
  });

  if (loading) {
    return (
      <div className="p-4 md:p-8 pt-20 md:pt-8 max-w-6xl mx-auto flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-zinc-500" size={24} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 pt-20 md:pt-8 max-w-6xl mx-auto">
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4 text-red-400 text-sm">{error}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pt-20 md:pt-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Grab Tracker</h2>
          <p className="text-zinc-500 text-sm mt-1">Track your e-hailing earnings</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/export?type=grab"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
          >
            <Download size={12} />
            Export CSV
          </a>
          <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700">
            <Plus size={16} className="mr-2" /> Log Ride
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="bg-zinc-900/50 border-zinc-800 mb-6">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm text-white">New Grab Entry</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="bg-zinc-950 border-zinc-800 text-white h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Platform</Label>
                <select
                  aria-label="Platform"
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value })}
                  className="w-full h-9 px-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm"
                >
                  {platforms.map((p) => <option key={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Hours</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.hours}
                  onChange={(e) => setForm({ ...form, hours: e.target.value })}
                  className="bg-zinc-950 border-zinc-800 text-white h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Gross (RM)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.gross}
                  onChange={(e) => setForm({ ...form, gross: e.target.value })}
                  className="bg-zinc-950 border-zinc-800 text-white h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Fuel (RM)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.fuel}
                  onChange={(e) => setForm({ ...form, fuel: e.target.value })}
                  className="bg-zinc-950 border-zinc-800 text-white h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Net (RM)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.net}
                  onChange={(e) => setForm({ ...form, net: e.target.value })}
                  className="bg-zinc-950 border-zinc-800 text-white h-9"
                />
              </div>
              <div className="col-span-2 flex gap-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? (
                    <><Loader2 size={14} className="animate-spin mr-2" />Saving...</>
                  ) : (
                    "Save Entry"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="bg-zinc-900 border-zinc-800 text-white"
                >
                  Cancel
                </Button>
              </div>
            </form>
            {saveResult && (
              <div className={`mt-3 text-sm ${saveResult.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
                {saveResult.message}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <p className="text-xs text-zinc-500">This Week</p>
            <p className="text-lg font-bold text-green-400">RM{weekTotal.toFixed(0)}</p>
            <p className="text-xs text-zinc-600">{thisWeekEntries.length} entries</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <p className="text-xs text-zinc-500">This Month</p>
            <p className="text-lg font-bold text-blue-400">RM{monthTotal.toFixed(0)}</p>
            <p className="text-xs text-zinc-600">{thisMonthEntries.length} entries</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <p className="text-xs text-zinc-500">Avg/Day</p>
            <p className="text-lg font-bold text-white">RM{avgPerDay.toFixed(0)}</p>
            <p className="text-xs text-zinc-600">{avgHours.toFixed(1)} hrs/day</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm text-white">This Week</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekChartData}>
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
