import { sqliteTable, text, real, integer, index } from "drizzle-orm/sqlite-core";

// ─── Auth Tables (Better Auth) ───────────────────────────────────────────

export const user = sqliteTable("User", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
  name: text("name"),
  image: text("image"),
  password: text("password"),
  createdAt: text("createdAt").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updatedAt").notNull(),
});

export const session = sqliteTable("Session", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: text("expiresAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  createdAt: text("createdAt").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updatedAt").notNull(),
});

export const account = sqliteTable("Account", {
  id: text("id").primaryKey(),
  type: text("type").notNull().default("email"),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: text("accessTokenExpiresAt"),
  refreshTokenExpiresAt: text("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: text("createdAt").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updatedAt").notNull(),
});

export const verification = sqliteTable("Verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: text("expiresAt").notNull(),
  createdAt: text("createdAt").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updatedAt").notNull(),
});

// ─── App Tables ────────────────────────────────────────────────────────────

export const debt = sqliteTable(
  "Debt",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(), // SPayLater, SFinancing, CarLoan, MARA
    balance: real("balance").notNull(),
    monthlyPayment: real("monthlyPayment").notNull(),
    interestRate: real("interestRate"),
    startDate: text("startDate").notNull(),
    endDate: text("endDate"),
    status: text("status").notNull().default("active"), // active, paid, frozen
    notes: text("notes"),
    createdAt: text("createdAt").notNull().default("CURRENT_TIMESTAMP"),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("status").on(table.status),
  ]
);

export const paymentCalendar = sqliteTable(
  "PaymentCalendar",
  {
    id: text("id").primaryKey(),
    debtId: text("debtId").references(() => debt.id),
    dueDate: text("dueDate").notNull(),
    amount: real("amount").notNull(),
    status: text("status").notNull().default("pending"), // pending, paid, late
    paidDate: text("paidDate"),
    notes: text("notes"),
    createdAt: text("createdAt").notNull().default("CURRENT_TIMESTAMP"),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("status_dueDate").on(table.status, table.dueDate),
  ]
);

export const grabEntry = sqliteTable(
  "GrabEntry",
  {
    id: text("id").primaryKey(),
    date: text("date").notNull(),
    platform: text("platform").notNull(), // Grab, Bolt, inDrive
    hours: real("hours").notNull(),
    gross: real("gross").notNull(),
    commission: real("commission"),
    fuel: real("fuel"),
    tolls: real("tolls"),
    net: real("net"),
    notes: text("notes"),
    createdAt: text("createdAt").notNull().default("CURRENT_TIMESTAMP"),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("date").on(table.date),
  ]
);

export const monthlyDashboard = sqliteTable(
  "MonthlyDashboard",
  {
    id: text("id").primaryKey(),
    month: text("month").notNull().unique(), // First day of month
    salary: real("salary").notNull().default(0),
    grabIncome: real("grabIncome").notNull().default(0),
    freelanceIncome: real("freelanceIncome").notNull().default(0),
    totalCommitments: real("totalCommitments").notNull().default(0),
    food: real("food").notNull().default(0),
    fuelTolls: real("fuelTolls").notNull().default(0),
    grabCosts: real("grabCosts").notNull().default(0),
    surplus: real("surplus"),
    notes: text("notes"),
    createdAt: text("createdAt").notNull().default("CURRENT_TIMESTAMP"),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("month").on(table.month),
  ]
);

export const subscription = sqliteTable("Subscription", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  cost: real("cost").notNull(),
  renewalDate: text("renewalDate"),
  category: text("category"), // tools, entertainment, utilities
  rating: text("rating").notNull().default("Essential"), // Essential, Nice-to-have, Unused
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  notes: text("notes"),
  createdAt: text("createdAt").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updatedAt").notNull(),
});
