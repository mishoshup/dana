import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/unified";
import { debt as debtTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuthTuple } from "@/lib/auth-helpers";
import { debtUpdateSchema } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [authError] = await requireAuthTuple();
  if (authError) return authError;

  try {
    const db = await getDb();
    const { id } = await params;
    const body = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Debt ID required" }, { status: 400 });
    }

    const parsed = debtUpdateSchema.safeParse(body);
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
    const [debt] = await db.update(debtTable)
      .set({
        ...(data.type !== undefined && { type: data.type }),
        ...(data.balance !== undefined && { balance: data.balance }),
        ...(data.monthlyPayment !== undefined && { monthlyPayment: data.monthlyPayment }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate).toISOString() : null }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(debtTable.id, id))
      .returning();

    if (!debt) {
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    return NextResponse.json(debt);
  } catch (error) {
    console.error("Database error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [authError] = await requireAuthTuple();
  if (authError) return authError;

  try {
    const db = await getDb();
    const { id } = await params;
    await db.delete(debtTable).where(eq(debtTable.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Database error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
