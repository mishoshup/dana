import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/unified";
import { grabEntry as grabEntryTable } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAuthTuple } from "@/lib/auth-helpers";
import { grabSchema } from "@/lib/validation";

export async function GET() {
  const [authError] = await requireAuthTuple();
  if (authError) return authError;

  try {
    const db = await getDb();
    const entries = await db.select().from(grabEntryTable)
      .orderBy(desc(grabEntryTable.date))
      .limit(50)
      .all();
    return NextResponse.json(entries);
  } catch (error) {
    console.error("Database error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const [authError] = await requireAuthTuple();
  if (authError) return authError;

  try {
    const db = await getDb();
    const body = await req.json();

    const parsed = grabSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const [entry] = await db.insert(grabEntryTable).values({
      id: crypto.randomUUID(),
      date: new Date(data.date).toISOString(),
      platform: data.platform,
      hours: data.hours,
      gross: data.gross,
      commission: data.commission ?? 0,
      fuel: data.fuel ?? 0,
      tolls: data.tolls ?? 0,
      net: data.net ?? null,
      notes: data.notes ?? null,
      updatedAt: new Date().toISOString(),
    }).returning();
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Database error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
