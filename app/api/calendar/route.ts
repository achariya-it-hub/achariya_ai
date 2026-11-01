import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const unprocessedOnly = searchParams.get("unprocessed") === "true";
    const status = searchParams.get("status");

    const where: any = {};
    if (unprocessedOnly) {
      where.isProcessed = false;
    }
    if (status && status !== "all") {
      where.status = status;
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { start: "asc" },
    });

    return NextResponse.json(events);
  } catch (err) {
    console.warn("Prisma error fetching calendar events:", err);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check if it's a bulk creation request
    if (Array.isArray(body)) {
      const created = await Promise.all(
        body.map(async (item: any) => {
          const startDate = item.start ? new Date(item.start) : new Date();
          const endDate = item.end ? new Date(item.end) : null;

          return prisma.calendarEvent.create({
            data: {
              title: item.title || "Untitled Event",
              description: item.description || null,
              type: item.type || "event",
              category: item.category || "General",
              priority: item.priority || "medium",
              status: item.status || "pending",
              isProcessed: Boolean(item.isProcessed),
              processedAt: item.isProcessed ? new Date() : null,
              processedBy: item.processedBy || null,
              start: startDate,
              end: endDate,
              allDay: Boolean(item.allDay),
              location: item.location || null,
              clientName: item.clientName || null,
              clientPhone: item.clientPhone || null,
              clientEmail: item.clientEmail || null,
              reminderInterval: Number(item.reminderInterval) || 15,
              reminderUnit: item.reminderUnit || "minutes",
              lastRemindedAt: item.lastRemindedAt ? new Date(item.lastRemindedAt) : null,
              reminderCount: Number(item.reminderCount) || 0,
              assigneeId: item.assigneeId || null,
              projectId: item.projectId || null,
              color: item.color || "#6366f1",
              source: item.source || "manual",
            },
          });
        })
      );
      return NextResponse.json(created, { status: 201 });
    }

    // Single creation
    const startDate = body.start ? new Date(body.start) : new Date();
    const endDate = body.end ? new Date(body.end) : null;

    const event = await prisma.calendarEvent.create({
      data: {
        title: body.title || "Untitled Event",
        description: body.description || null,
        type: body.type || "event",
        category: body.category || "General",
        priority: body.priority || "medium",
        status: body.status || "pending",
        isProcessed: Boolean(body.isProcessed),
        processedAt: body.isProcessed ? new Date() : null,
        processedBy: body.processedBy || null,
        start: startDate,
        end: endDate,
        allDay: Boolean(body.allDay),
        location: body.location || null,
        clientName: body.clientName || null,
        clientPhone: body.clientPhone || null,
        clientEmail: body.clientEmail || null,
        reminderInterval: Number(body.reminderInterval) || 15,
        reminderUnit: body.reminderUnit || "minutes",
        lastRemindedAt: body.lastRemindedAt ? new Date(body.lastRemindedAt) : null,
        reminderCount: Number(body.reminderCount) || 0,
        assigneeId: body.assigneeId || null,
        projectId: body.projectId || null,
        color: body.color || "#6366f1",
        source: body.source || "manual",
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (err: any) {
    console.error("Error creating calendar event:", err);
    return NextResponse.json({ error: err.message || "Failed to create event" }, { status: 500 });
  }
}
