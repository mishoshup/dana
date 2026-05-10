# UI-SPEC: Debt Tracker

## Colors (Inherit app dark theme)

| Token | Value | Usage |
|-------|-------|-------|
| `bg-page` | `bg-black` | Page body |
| `bg-card` | `bg-zinc-900/50` | All cards |
| `border-card` | `border-zinc-800` | Card borders |
| `text-primary` | `text-white` | Headings, balances |
| `text-secondary` | `text-zinc-400` | Labels, subtitles |
| `text-muted` | `text-zinc-500` | Metadata, notes |
| `bg-input` | `bg-zinc-950` | Form inputs |
| `border-input` | `border-zinc-800` | Input borders |

### Per-debt colors (matching existing page.tsx)

| Debt | Border/Accent | Text |
|------|-------------|------|
| SPayLater | `border-red-500/30 bg-red-500/5` | `text-red-400` |
| S-Financing I | `border-orange-500/30 bg-orange-500/5` | `text-orange-400` |
| Car Loan | `border-yellow-500/30 bg-yellow-500/5` | `text-yellow-400` |
| MARA | `border-green-500/30 bg-green-500/5` | `text-green-400` |

---

## 1. Summary Cards — Top of /debt

**Layout**: `grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-6`

Four `Card size="sm"` components:

```tsx
// Template per card
<Card size="sm" className="bg-zinc-900/50 border-zinc-800">
  <CardContent className="p-3">
    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
    <p className="text-lg font-bold text-{color}">{value}</p>
    <p className="text-[10px] text-zinc-600">{sub}</p>
  </CardContent>
</Card>
```

| Card | Value | Color | Sub |
|------|-------|-------|-----|
| Total Debt | `RM89,245` | `text-red-400` | `4 active debts` |
| Monthly Burn | `RM1,838/mo` | `text-orange-400` | `4 debts` |
| Paid This Month | `RM0` | `text-emerald-400` | `0 of 4 payments` |
| Freedom Countdown | `118 payments` | `text-blue-400` | `Est. Apr 2036` |

---

## 2. Debt Cards — Main List

**Layout**: `space-y-2` (vertically stacked, full bleed)

Per debt, a `Card size="sm"` with:

```tsx
<Card size="sm" className={`rounded-xl border ${colorMap[d.name]} p-3`}>
  {/* Header row: name + badge + balance */}
  <div className="flex items-center justify-between mb-1.5">
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-white">{name}</span>
      <Badge variant="outline" className={`text-[9px] ${textMap[d.name]} border-current`}>
        {rate}
      </Badge>
    </div>
    <span className="text-sm font-bold text-white">RM{balance.toLocaleString()}</span>
  </div>

  {/* Progress bar — bg-zinc-800 track, colored fill */}
  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-1.5">
    <div
      className={`h-full rounded-full ${colorClass}`}
      style={{ width: `${pct}%` }}
    />
  </div>

  {/* Footer row: monthly + clear date */}
  <div className="flex items-center justify-between text-[10px]">
    <span className="text-zinc-500">RM{monthly}/mo</span>
    <span className="text-zinc-500">Clear: {end}</span>
  </div>

  {/* Action row */}
  <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-zinc-800/50">
    <Button variant="ghost" size="xs" className="text-zinc-400 h-7">Details</Button>
    <Button variant="default" size="xs" className="bg-blue-600 hover:bg-blue-700 h-7">
      Pay
    </Button>
  </div>
</Card>
```

### Interactive behavior

- **Details**: `router.push("/debt/[id]")` — scrolls to detail view or navigates to detail page
- **Pay**: Opens `PayDialog` `Sheet` with debt pre-selected
- **Hover**: Card gets `hover:bg-zinc-900/80` via Tailwind
- **Progress bar**: % = `paid / (paid + balance) * 100`; starts at 0% for fresh debts

---

## 3. Payment Dialog — PayDialog Component

**Mobile**: `Sheet side="bottom"` — slides up from bottom
**Desktop**: `Sheet side="right" sm:max-w-sm` — side panel

```tsx
<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent side={isMobile ? "bottom" : "right"} className="bg-zinc-950 border-zinc-800">
    <SheetHeader>
      <SheetTitle className="text-white text-sm">Log Payment</SheetTitle>
      <SheetDescription className="text-zinc-500 text-xs">
        Record a payment to any debt
      </SheetDescription>
    </SheetHeader>

    <div className="space-y-4 px-4 py-4">
      {/* Debt selector */}
      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-400">Debt</Label>
        <Select value={selectedDebt} onValueChange={setSelectedDebt}>
          <SelectTrigger className="w-full bg-zinc-950 border-zinc-800 text-white h-9">
            <SelectValue placeholder="Select debt" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-950 border-zinc-800">
            {debts.map(d => (
              <SelectItem key={d.id} value={d.id} className="text-white">
                {d.name} — RM{d.balance.toLocaleString()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Amount */}
      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-400">Amount (RM)</Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          className="bg-zinc-950 border-zinc-800 text-white h-9"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {/* Date */}
      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-400">Date</Label>
        <Input
          type="date"
          className="bg-zinc-950 border-zinc-800 text-white h-9"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-400">Notes (optional)</Label>
        <Input
          placeholder="e.g. Extra payment"
          className="bg-zinc-950 border-zinc-800 text-white h-9"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>
    </div>

    <SheetFooter className="px-4 pb-4">
      <div className="flex gap-2 w-full">
        <Button variant="outline" onClick={onClose} className="flex-1 border-zinc-800 text-zinc-400">
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={submitting}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          {submitting ? <Loader2 className="animate-spin mr-1" size={14} /> : null}
          Save Payment
        </Button>
      </div>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

### Validation

| Field | Rule | Error |
|-------|------|-------|
| Debt | Required | "Please select a debt" |
| Amount | Required, > 0, ≤ debt.balance | "Must be > 0" / "Cannot exceed RM{balance}" |
| Date | Required, ≤ today | "Date cannot be in the future" |

### Post-submit

- Sheet closes
- Balance decreases, progress bar updates, "Paid This Month" increments
- Toast (inline state change — no library) or badge flash

---

## 4. Snowball View Toggle

**Location**: Between summary cards and debt list

```tsx
<div className="flex items-center mb-3">
  <h3 className="text-sm font-semibold text-white flex items-center gap-2 flex-1">
    <TrendingDown size={14} className="text-red-400" />
    {snowballMode ? "Snowball Priority" : "All Debts"}
  </h3>
  <Button
    variant="ghost"
    size="sm"
    onClick={() => setSnowballMode(!snowballMode)}
    className="text-xs text-blue-400 hover:text-blue-300 h-7"
  >
    {snowballMode ? "Default View" : "Snowball View"}
    <ArrowRight size={12} className="ml-1" />
  </Button>
</div>
```

### Behavior

- **Default view**: debts in logical order (SPayLater → S-Financing I → Car Loan → MARA)
- **Snowball mode**: debts sorted by `balance ASC` → MARA (1,200) → S-Financing I (2,988) → SPayLater (5,057) → Car Loan (80,000)
- **Snowball mode indicator**: Each card gets a subtle rank badge `#1`, `#2`, `#3`, `#4`
- **#1 card** gets a small banner: `Badge variant="secondary"` with text "Attack first! Smallest balance"

---

## 5. Extra Payment Projection Input

**Location**: `/debt/[id]` detail page, below stats

```tsx
<Card size="sm" className="bg-zinc-900/50 border-zinc-800">
  <CardHeader className="p-4 pb-2">
    <CardTitle className="text-sm text-white flex items-center gap-2">
      <TrendingDown size={14} className="text-blue-400" />
      Payoff Projection
    </CardTitle>
    <CardDescription className="text-[10px] text-zinc-500 mt-0.5">
      See how extra payments accelerate your timeline
    </CardDescription>
  </CardHeader>
  <CardContent className="p-4 pt-2">
    <div className="flex items-center gap-3 mb-3">
      <span className="text-xs text-zinc-400 shrink-0">Extra /mo</span>
      <Input
        type="number"
        placeholder="RM 0"
        className="bg-zinc-950 border-zinc-800 text-white h-8 w-28 text-sm"
        value={extraAmount}
        onChange={e => handleProjection(e.target.value)}
      />
    </div>
    {projectionResult && (
      <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">Current</span>
          <span className="text-zinc-500">Projected</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-white font-semibold">{baselineClearDate}</span>
          <ArrowRight size={12} className="text-zinc-600 mx-2" />
          <span className="text-emerald-400 font-semibold">{projectedClearDate}</span>
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px]">
          <span className="text-zinc-600">{baselineMonths} months</span>
          <span className="text-emerald-400 font-medium">
            {monthsSaved > 0 ? `${monthsSaved} months sooner!` : "No change"}
          </span>
          <span className="text-zinc-600">{projectedMonths} months</span>
        </div>
      </div>
    )}
  </CardContent>
</Card>
```

### Projection math (inline, no API)

```
baselineMonths = balance / monthlyPayment
projectedMonths = balance / (monthlyPayment + extraAmount)
monthsSaved = baselineMonths - projectedMonths
```

---

## 6. Loading & Empty States

### Loading skeleton

Replace each debt card with a skeleton:

```tsx
<Card size="sm" className="bg-zinc-900/50 border-zinc-800 animate-pulse">
  <CardContent className="p-3 space-y-2">
    <div className="flex justify-between">
      <div className="h-3 w-24 bg-zinc-800 rounded" />
      <div className="h-3 w-16 bg-zinc-800 rounded" />
    </div>
    <div className="h-1.5 bg-zinc-800 rounded-full" />
    <div className="flex justify-between">
      <div className="h-2.5 w-20 bg-zinc-800 rounded" />
      <div className="h-2.5 w-16 bg-zinc-800 rounded" />
    </div>
  </CardContent>
</Card>
```

Summary card skeleton:

```tsx
<Card size="sm" className="bg-zinc-900/50 border-zinc-800 animate-pulse">
  <CardContent className="p-3 space-y-1.5">
    <div className="h-2.5 w-16 bg-zinc-800 rounded" />
    <div className="h-5 w-20 bg-zinc-800 rounded" />
    <div className="h-2 w-12 bg-zinc-800 rounded" />
  </CardContent>
</Card>
```

### Empty states

**No debts yet** (rare — fixed 4 debts, but graceful):

```tsx
<Card size="sm" className="bg-zinc-900/50 border-zinc-800">
  <CardContent className="p-6 text-center">
    <CreditCard size={24} className="mx-auto text-zinc-600 mb-2" />
    <p className="text-zinc-400 text-xs font-medium">No debts tracked</p>
    <p className="text-zinc-600 text-[10px] mt-0.5">Your debts will appear here</p>
  </CardContent>
</Card>
```

**No payments this month** (in summary):

```tsx
// "Paid This Month" card shows
<p className="text-lg font-bold text-zinc-500">RM0</p>
<p className="text-[10px] text-zinc-700">No payments yet</p>
```

**No payment history** (per-debt detail):

```tsx
<CardContent className="p-6 text-center">
  <Calendar size={20} className="mx-auto text-zinc-600 mb-2" />
  <p className="text-zinc-500 text-xs">No payments logged yet</p>
  <p className="text-zinc-600 text-[10px] mt-1">Log your first payment to see history</p>
</CardContent>
```

---

## 7. Debt Distribution Bar Chart

**Location**: At bottom of `/debt` page, after debt list

```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const DEBT_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e"];

<Card size="sm" className="bg-zinc-900/50 border-zinc-800">
  <CardHeader className="p-4 pb-2">
    <CardTitle className="text-sm text-white">Debt Distribution</CardTitle>
  </CardHeader>
  <CardContent className="p-4">
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={debts} layout="vertical" barCategoryGap={8}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
        <XAxis
          type="number"
          stroke="#71717a"
          fontSize={11}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `RM${(v / 1000).toFixed(0)}k`}
        />
        <YAxis
          dataKey="name"
          type="category"
          stroke="#71717a"
          fontSize={11}
          width={90}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#18181b",
            border: "1px solid #27272a",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value: number) => [`RM${value.toLocaleString()}`, "Balance"]}
        />
        <Bar dataKey="balance" radius={[0, 4, 4, 0]} barSize={18}>
          {debts.map((_, i) => (
            <Cell key={i} fill={DEBT_COLORS[i]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </CardContent>
</Card>
```

### Chart specs

| Property | Value |
|----------|-------|
| Type | Horizontal `BarChart` (layout="vertical") |
| Height | 200px (`ResponsiveContainer`) |
| Bar shape | `radius={[0, 4, 4, 0]}` (rounded right corners) |
| Bar width | `barSize={18}` |
| Grid | Dashed, `#27272a`, horizontal lines only |
| Axis labels | `#71717a`, 11px, no axis lines |
| Tooltip bg | `#18181b`, dark border, 12px text |
| Cell colors | Per-debt: red, orange, yellow, green |

---

## Summary: All shadcn components used

| Component | Count | Usage |
|-----------|-------|-------|
| `Card` (+ `CardHeader`, `CardContent`, `CardFooter`, `CardDescription`) | 7+ | Summary grid (4), debt list (4), chart (1), projection (1), empty/loading |
| `Badge` | 5+ | Interest rate per debt, status badges |
| `Button` | 8+ | Pay, Details, Snowball toggle, dialog actions |
| `Sheet` (+ `SheetHeader`, `SheetContent`, `SheetFooter`, `SheetTitle`, `SheetDescription`) | 1 | PayDialog |
| `Input` | 3 | Amount, date, notes in PayDialog; extra payment in projection |
| `Select` (+ `SelectTrigger`, `SelectContent`, `SelectItem`) | 1 | Debt picker in PayDialog |
| `Label` | 3 | Form field labels |
| `Separator` | 1-2 | Between sections (optional) |
| `Switch` | 1 | Regular vs extra payment (in PayDialog) |

### Recharts used

| Chart | Component |
|-------|-----------|
| Debt distribution | `BarChart` + `Bar` + `XAxis` + `YAxis` + `CartesianGrid` + `Tooltip` + `ResponsiveContainer` + `Cell` |

### Lucide icons used

| Icon | Location |
|------|----------|
| `CreditCard` | Empty state, section headings |
| `TrendingDown` | Section heading (Debt Tracker) |
| `Calendar` | Empty payment history |
| `AlertTriangle` | Error states |
| `CheckCircle2` | Success/paid empty state |
| `ArrowRight` | Snowball toggle, projection comparison |
| `Loader2` | Submit spinner |
| `X` | Sheet close button |
