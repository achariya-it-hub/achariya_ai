import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

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
    const body = await request.json();
    const { proofs, project, assignee, milestone, createdAt, ...cleanTaskData } = body;
    if (!user || user.role !== "admin") {
      delete cleanTaskData.payout;
    } else if (cleanTaskData.assigneeId) {
      try {
        const assigneeUser = await prisma.user.findUnique({ where: { id: cleanTaskData.assigneeId } });
        if (assigneeUser && assigneeUser.role !== "trainee") {
          cleanTaskData.payout = 0;
        }
      } catch {}
    }
    const task = await prisma.task.update({
      where: { id },
      data: cleanTaskData,
      include: {
        project: true,
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        milestone: true,
        proofs: true,
      },
    });
    return NextResponse.json(task);
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
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ message: "Task deleted" });
}
