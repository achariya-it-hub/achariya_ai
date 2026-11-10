import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";
import {
  recordSyncedTaskDelete,
  recordSyncedTaskUpsert,
  sanitizePrismaTaskInput,
} from "@/lib/task-sync";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: true,
      assignee: { select: { id: true, name: true, email: true, avatar: true } },
      milestone: true,
      proofs: true,
    },
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  return NextResponse.json(task);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const cleanTaskData = sanitizePrismaTaskInput(body, false);
    delete cleanTaskData.id;

    if (!user || user.role !== "admin") {
      delete cleanTaskData.payout;
    } else if (cleanTaskData.assigneeId) {
      try {
        const assigneeUser = await prisma.user.findUnique({
          where: { id: String(cleanTaskData.assigneeId) },
        });
        if (assigneeUser && assigneeUser.role !== "trainee") {
          cleanTaskData.payout = 0;
        }
      } catch {}
    }

    try {
      const task = await prisma.task.update({
        where: { id },
        data: cleanTaskData as any,
        include: {
          project: true,
          assignee: { select: { id: true, name: true, email: true, avatar: true } },
          milestone: true,
          proofs: true,
        },
      });
      await recordSyncedTaskUpsert(task as unknown as Record<string, unknown>);
      return NextResponse.json(task);
    } catch (dbErr) {
      console.warn("Prisma update fallback on serverless lambda:", dbErr);
      const updated = { id, ...cleanTaskData };
      await recordSyncedTaskUpsert(updated);
      return NextResponse.json(updated);
    }
  } catch (err) {
    console.error("Prisma update task error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await recordSyncedTaskDelete(id);
  try {
    await prisma.task.delete({ where: { id } });
  } catch (err) {
    console.warn("Prisma delete fallback on serverless lambda:", err);
  }
  return NextResponse.json({ message: "Task deleted" });
}
