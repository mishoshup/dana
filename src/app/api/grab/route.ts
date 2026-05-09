import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const entries = await prisma.grabEntry.findMany({
    orderBy: { date: "desc" },
    take: 50,
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entry = await prisma.grabEntry.create({
      data: {
        date: new Date(body.date),
        platform: body.platform,
        hours: body.hours,
        gross: body.gross,
        commission: body.commission || 0,
        fuel: body.fuel || 0,
        tolls: body.tolls || 0,
        net: body.net,
        notes: body.notes || null,
      },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}
