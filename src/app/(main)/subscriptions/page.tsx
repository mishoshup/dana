"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

// ── Types ──────────────────────────────────────────
interface Subscription {
  id: string;
  name: string;
  cost: number;
  category: string | null;
  rating: string;
  active: boolean;
}

type Status = "loading" | "error" | "success";

// ── Ratings ────────────────────────────────────────
const ratingColors: Record<string, string> = {
  Essential: "bg-green-500/10 text-green-400 border-green-500/20",
  "Nice-to-have": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Unused: "bg-red-500/10 text-red-400 border-red-500/20",
};

// ── Skeleton rows ──────────────────────────────────
function LoadingRow() {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800 animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="h-4 w-32 bg-zinc-800 rounded mb-2" />
              <div className="flex items-center gap-2">
                <div className="h-3 w-16 bg-zinc-800 rounded" />
                <div className="h-5 w-20 bg-zinc-800 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-4 w-14 bg-zinc-800 rounded" />
            <div className="h-6 w-10 bg-zinc-800 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Component ──────────────────────────────────────
export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  // ── Fetch ──────────────────────────────────────
  const fetchSubscriptions = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/subscriptions");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Subscription[] = await res.json();
      setSubscriptions(data);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // ── Toggle ─────────────────────────────────────
  const toggleActive = useCallback(async (sub: Subscription) => {
    setTogglingIds((prev) => new Set(prev).add(sub.id));

    // Optimistic update
    setSubscriptions((prev) =>
      prev.map((s) =>
        s.id === sub.id ? { ...s, active: !s.active } : s
      )
    );

    try {
      const res = await fetch(`/api/subscriptions/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !sub.active }),
      });

      if (!res.ok) {
        // Revert on failure
        setSubscriptions((prev) =>
          prev.map((s) =>
            s.id === sub.id ? { ...s, active: sub.active } : s
          )
        );
      }
    } catch {
      // Revert on network error
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id === sub.id ? { ...s, active: sub.active } : s
        )
      );
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(sub.id);
        return next;
      });
    }
  }, []);

  // ── Derived ────────────────────────────────────
  const activeCount = subscriptions.filter((s) => s.active).length;
  const totalActive = subscriptions
    .filter((s) => s.active)
    .reduce((sum, s) => sum + s.cost, 0);
  const savingPotential = subscriptions
    .filter((s) => s.rating === "Unused")
    .reduce((sum, s) => sum + s.cost, 0);

  // ── Render helpers ─────────────────────────────
  function renderSubItem(sub: Subscription) {
    const isToggling = togglingIds.has(sub.id);

    return (
      <Card key={sub.id} className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm text-white font-medium">{sub.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {sub.category && (
                    <span className="text-xs text-zinc-500">{sub.category}</span>
                  )}
                  <Badge
                    variant="outline"
                    className={`text-xs ${ratingColors[sub.rating] || ""}`}
                  >
                    {sub.rating}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-white">
                RM{sub.cost.toFixed(2)}
              </span>
              <Switch
                checked={sub.active}
                disabled={isToggling}
                onCheckedChange={() => toggleActive(sub)}
                className="data-[state=unchecked]:bg-zinc-700"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderError() {
    return (
      <div className="p-4 md:p-8 pt-20 md:pt-8 max-w-4xl mx-auto w-full">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-zinc-400 mb-2">Failed to load subscriptions</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSubscriptions}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="p-4 md:p-8 pt-20 md:pt-8 max-w-4xl mx-auto w-full animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-8 w-40 bg-zinc-800 rounded mb-2" />
            <div className="h-4 w-24 bg-zinc-800 rounded" />
          </div>
          <div className="text-right">
            <div className="h-3 w-20 bg-zinc-800 rounded mb-1 ml-auto" />
            <div className="h-6 w-24 bg-zinc-800 rounded ml-auto" />
          </div>
        </div>
        <div className="space-y-2">
          <LoadingRow />
          <LoadingRow />
          <LoadingRow />
          <LoadingRow />
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────
  if (status === "error") {
    return renderError();
  }

  // ── Success ────────────────────────────────────
  return (
    <div className="p-4 md:p-8 pt-20 md:pt-8 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Subscriptions</h2>
          <p className="text-zinc-500 text-sm mt-1">{activeCount} active services</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Monthly Total</p>
          <p className="text-xl font-bold text-white">
            RM{totalActive.toFixed(2)}
          </p>
          {savingPotential > 0 && (
            <p className="text-xs text-green-400">
              RM{savingPotential.toFixed(2)} savings possible
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {subscriptions.length === 0 ? (
          <p className="text-center text-zinc-600 py-10 text-sm">
            No subscriptions yet. Add one to get started.
          </p>
        ) : (
          subscriptions.map(renderSubItem)
        )}
      </div>
    </div>
  );
}
