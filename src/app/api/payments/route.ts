import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const payments = await prisma.paymentCalendar.findMany({
    orderBy: { dueDate: "asc" },
    take: 50,
  });
  return NextResponse.json(payments);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payment = await prisma.paymentCalendar.create({
      data: {
        debtId: body.debtId || null,
        dueDate: new Date(body.dueDate),
        amount: body.amount,
        status: body.status || "pending",
        paidDate: body.paidDate ? new Date(body.paidDate) : null,
        notes: body.notes || null,
      },
    });
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const payment = await prisma.paymentCalendar.update({
      where: { id: body.id },
      data: {
        status: body.status,
        paidDate: body.paidDate ? new Date(body.paidDate) : null,
      },
    });
    return NextResponse.json(payment);
  } catch (error) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}
