"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const subscriptions = [
  { name: "Claude Code", cost: 78.40, category: "Tools", rating: "Essential", active: true },
  { name: "OpenCode", cost: 39.20, category: "Tools", rating: "Essential", active: true },
  { name: "Telco Plan", cost: 110.00, category: "Utilities", rating: "Essential", active: true },
  { name: "Netflix", cost: 15.75, category: "Entertainment", rating: "Nice-to-have", active: true },
  { name: "Spotify", cost: 5.15, category: "Entertainment", rating: "Nice-to-have", active: true },
  { name: "Grab+", cost: 9.90, category: "Tools", rating: "Unused", active: false },
];

const ratingColors: Record<string, string> = {
  "Essential": "bg-green-500/10 text-green-400 border-green-500/20",
  "Nice-to-have": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "Unused": "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function SubscriptionsPage() {
  const totalActive = subscriptions.filter((s) => s.active).reduce((s, s2) => s + s2.cost, 0);
  const savingPotential = subscriptions.filter((s) => s.rating === "Unused").reduce((s, s2) => s + s2.cost, 0);

  return (
    <div className="min-h-screen bg-black p-4 md:p-8 pt-16 md:pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Subscriptions</h2>
          <p className="text-zinc-500 text-sm mt-1">{subscriptions.length} active services</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Monthly Total</p>
          <p className="text-xl font-bold text-white">RM{totalActive.toFixed(2)}</p>
          {savingPotential > 0 && (
            <p className="text-xs text-green-400">RM{savingPotential.toFixed(2)} savings possible</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {subscriptions.map((sub) => (
          <Card key={sub.name} className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm text-white font-medium">{sub.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-zinc-500">{sub.category}</span>
                      <Badge variant="outline" className={`text-xs ${ratingColors[sub.rating] || ""}`}>
                        {sub.rating}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white">RM{sub.cost.toFixed(2)}</span>
                  <Switch defaultChecked={sub.active} className="data-[state=unchecked]:bg-zinc-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
