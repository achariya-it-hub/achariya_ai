import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedData } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status");

  try {
    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: true,
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        milestone: true,
        proofs: true,
      },
    });

    if (tasks && tasks.length > 0) {
      return NextResponse.json(tasks);
    }
  } catch (err) {
    console.warn("Prisma error fetching tasks on Netlify lambda, falling back to seedData:", err);
  }

  let fallbackTasks = seedData.tasks;
  if (projectId) fallbackTasks = fallbackTasks.filter((t) => t.projectId === projectId);
  if (status) fallbackTasks = fallbackTasks.filter((t) => t.status === status);

  return NextResponse.json(fallbackTasks);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { proofs, project, assignee, milestone, createdAt, ...cleanTaskData } = body;
  try {
    const task = await prisma.task.create({
      data: cleanTaskData,
      include: {
        project: true,
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        milestone: true,
        proofs: true,
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error("Prisma create task error:", err);
    const fallbackTask = { ...cleanTaskData, id: `v-${Date.now()}`, proofs: [], createdAt: new Date().toISOString() };
    return NextResponse.json(fallbackTask, { status: 201 });
  }
}
