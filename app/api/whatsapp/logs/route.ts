import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const logs = await prisma.whatsappMessageLog.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(logs);
  } catch (err) {
    console.error("GET /api/whatsapp/logs error:", err);
    return NextResponse.json([]);
  }
}
