import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }

    let config = await prisma.whatsappConfig.findUnique({ where: { id: "default" } });
    if (!config) {
      config = await prisma.whatsappConfig.create({
        data: {
          id: "default",
          groupId: "group-crm-main",
          webhookToken: "wh_token_achariya_crm",
          enabled: true,
        },
      });
    }
    return NextResponse.json(config);
  } catch (err) {
    console.error("GET /api/whatsapp/config error:", err);
    return NextResponse.json({
      id: "default",
      groupId: "group-crm-main",
      webhookToken: "wh_token_achariya_crm",
      enabled: true,
    });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { groupId, phoneNumberId, webhookToken, defaultProjectId, enabled } = body;

    const config = await prisma.whatsappConfig.upsert({
      where: { id: "default" },
      update: {
        groupId,
        phoneNumberId,
        webhookToken,
        defaultProjectId,
        enabled: enabled ?? true,
      },
      create: {
        id: "default",
        groupId: groupId || "group-crm-main",
        phoneNumberId,
        webhookToken: webhookToken || "wh_token_achariya_crm",
        defaultProjectId,
        enabled: enabled ?? true,
      },
    });

    return NextResponse.json(config);
  } catch (err) {
    console.error("POST /api/whatsapp/config error:", err);
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return POST(request);
}
