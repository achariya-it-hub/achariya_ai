import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await prisma.calendarEvent.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.type !== undefined) data.type = body.type;
    if (body.category !== undefined) data.category = body.category;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.status !== undefined) data.status = body.status;
    if (body.allDay !== undefined) data.allDay = Boolean(body.allDay);
    if (body.location !== undefined) data.location = body.location;
    if (body.clientName !== undefined) data.clientName = body.clientName;
    if (body.clientPhone !== undefined) data.clientPhone = body.clientPhone;
    if (body.clientEmail !== undefined) data.clientEmail = body.clientEmail;
    if (body.reminderInterval !== undefined) data.reminderInterval = Number(body.reminderInterval);
    if (body.reminderUnit !== undefined) data.reminderUnit = body.reminderUnit;
    if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId;
    if (body.projectId !== undefined) data.projectId = body.projectId;
    if (body.color !== undefined) data.color = body.color;

    if (body.start) data.start = new Date(body.start);
    if (body.end !== undefined) data.end = body.end ? new Date(body.end) : null;

    // Handle processing toggle
    if (body.isProcessed !== undefined) {
      data.isProcessed = Boolean(body.isProcessed);
      if (data.isProcessed) {
        data.processedAt = new Date();
        data.status = body.status || "processed";
        data.processedBy = body.processedBy || "Current User";
      } else {
        data.processedAt = null;
        data.status = body.status || "pending";
      }
    }

    if (body.company !== undefined) data.company = body.company;
    if (body.snoozedUntil !== undefined) {
      data.snoozedUntil = body.snoozedUntil ? new Date(body.snoozedUntil) : null;
    }
    // Handle reminder ping / snooze
    if (body.lastRemindedAt) {
      data.lastRemindedAt = new Date(body.lastRemindedAt);
    }
    if (body.reminderCount !== undefined) {
      data.reminderCount = Number(body.reminderCount);
    }

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("Error updating event:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.calendarEvent.delete({
      where: { id },
    });
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
