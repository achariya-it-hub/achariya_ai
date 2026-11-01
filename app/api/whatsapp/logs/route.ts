import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }

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
