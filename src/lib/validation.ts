import { z } from "zod";

// ─── Debt ────────────────────────────────────────────────────────────────────

export const debtSchema = z.object({
  type: z.string().min(1, "Type is required").max(50),
  balance: z.number().min(0, "Balance must be >= 0"),
  monthlyPayment: z.number().min(0).default(0),
  interestRate: z.number().nullable().optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  status: z.enum(["active", "paid", "frozen"]).default("active"),
  notes: z.string().max(1000).nullable().optional(),
});

export const debtUpdateSchema = z.object({
  type: z.string().min(1).max(50).optional(),
  balance: z.number().min(0).optional(),
  monthlyPayment: z.number().min(0).optional(),
  interestRate: z.number().nullable().optional(),
  endDate: z.string().nullable().optional(),
  status: z.enum(["active", "paid", "frozen"]).optional(),
  notes: z.string().max(1000).nullable().optional(),
});

// ─── Payment Calendar ────────────────────────────────────────────────────────

export const paymentSchema = z.object({
  debtId: z.string().optional(),
  dueDate: z.string().min(1, "dueDate is required"),
  amount: z.number().min(0.01, "Amount must be > 0"),
  status: z.enum(["pending", "paid", "late"]).default("pending"),
  paidDate: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const paymentUpdateSchema = z.object({
  id: z.string().min(1, "Payment ID is required"),
  status: z.enum(["pending", "paid", "late"]).optional(),
  paidDate: z.string().nullable().optional(),
});

// ─── Grab / Ride ─────────────────────────────────────────────────────────────

export const grabSchema = z.object({
  date: z.string().min(1, "Date is required"),
  platform: z.enum(["Grab", "Bolt", "inDrive"]),
  hours: z.number().min(0).max(24),
  gross: z.number().min(0, "Gross must be >= 0"),
  commission: z.number().min(0).nullable().optional(),
  fuel: z.number().min(0).nullable().optional(),
  tolls: z.number().min(0).nullable().optional(),
  net: z.number().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

// ─── Subscriptions ───────────────────────────────────────────────────────────

export const subscriptionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  cost: z.number().min(0, "Cost must be >= 0"),
  category: z.string().min(1).max(50).nullable().optional(),
  rating: z.enum(["Essential", "Nice-to-have", "Unused"]).default("Essential"),
  active: z.boolean().default(true),
  renewalDate: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const subscriptionUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  cost: z.number().min(0).optional(),
  category: z.string().min(1).max(50).nullable().optional(),
  rating: z.enum(["Essential", "Nice-to-have", "Unused"]).optional(),
  active: z.boolean().optional(),
  renewalDate: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});
