import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const peerId = searchParams.get("peerId");
    const userId = searchParams.get("userId");

    let whereClause = {};

    if (peerId === "general") {
      whereClause = { receiverId: "general" };
    } else if (peerId && userId) {
      whereClause = {
        OR: [
          { senderId: userId, receiverId: peerId },
          { senderId: peerId, receiverId: userId },
        ],
      };
    }

    const messages = await prisma.chatMessage.findMany({
      where: whereClause,
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    const formatted = messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      receiverId: m.receiverId,
      content: m.content,
      status: m.status as "sent" | "delivered" | "read",
      fileUrl: m.fileUrl ?? undefined,
      fileName: m.fileName ?? undefined,
      timestamp: m.createdAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (err: any) {
    console.warn("Prisma error fetching chat messages:", err);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { senderId, receiverId, content, fileUrl, fileName } = body;

    if (!senderId || !receiverId || !content?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const created = await prisma.chatMessage.create({
      data: {
        senderId,
        receiverId,
        content: content.trim(),
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        status: "sent",
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        senderId: created.senderId,
        receiverId: created.receiverId,
        content: created.content,
        status: created.status,
        fileUrl: created.fileUrl ?? undefined,
        fileName: created.fileName ?? undefined,
        timestamp: created.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Error creating chat message:", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

