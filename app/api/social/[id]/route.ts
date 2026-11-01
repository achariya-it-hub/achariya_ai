import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    if (body.company !== undefined) data.company = body.company;
    if (body.platform !== undefined) data.platform = body.platform;
    if (body.status !== undefined) {
      data.status = body.status;
      if (body.status === "published" && !body.publishedAt) {
        data.publishedAt = new Date();
        data.isProcessed = true;
      }
    }
    if (body.content !== undefined) data.content = body.content;
    if (body.mediaUrl !== undefined) data.mediaUrl = body.mediaUrl;
    if (body.hashtags !== undefined) data.hashtags = body.hashtags;
    if (body.postUrl !== undefined) data.postUrl = body.postUrl;
    if (body.isProcessed !== undefined) data.isProcessed = Boolean(body.isProcessed);
    if (body.reminderInterval !== undefined) data.reminderInterval = Number(body.reminderInterval);

    if (body.lastRemindedAt !== undefined) {
      data.lastRemindedAt = body.lastRemindedAt ? new Date(body.lastRemindedAt) : null;
    }
    if (body.snoozedUntil !== undefined) {
      data.snoozedUntil = body.snoozedUntil ? new Date(body.snoozedUntil) : null;
    }

    if (body.scheduledAt !== undefined) {
      data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    }
    if (body.publishedAt !== undefined) {
      data.publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;
    }

    const updated = await prisma.socialPost.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("Error updating social post:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.socialPost.delete({
      where: { id },
    });
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
