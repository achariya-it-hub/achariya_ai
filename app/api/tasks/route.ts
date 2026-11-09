import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedData } from "@/lib/data";
import { getUser } from "@/lib/auth";
import {
  mergeTasksWithSyncState,
  recordSyncedTaskUpsert,
  sanitizePrismaTaskInput,
} from "@/lib/task-sync";

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
      orderBy: { createdAt: "desc" },
      include: {
        project: true,
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        milestone: true,
        proofs: true,
      },
    });

    if (tasks && tasks.length > 0) {
      let merged = mergeTasksWithSyncState(tasks);
      if (projectId) merged = merged.filter((t: any) => t.projectId === projectId);
      if (status) merged = merged.filter((t: any) => t.status === status);
      return NextResponse.json(merged);
    }
  } catch (err) {
    console.warn("Prisma error fetching tasks on Netlify lambda, falling back to seedData:", err);
  }

  let fallbackTasks = mergeTasksWithSyncState(seedData.tasks);
  if (projectId) fallbackTasks = fallbackTasks.filter((t) => t.projectId === projectId);
  if (status) fallbackTasks = fallbackTasks.filter((t) => t.status === status);

  return NextResponse.json(fallbackTasks);
}

export async function POST(request: Request) {
  const user = await getUser();
  const body = (await request.json()) as Record<string, unknown>;
  const cleanTaskData = sanitizePrismaTaskInput(body, true);

  if (!user || user.role !== "admin") {
    cleanTaskData.payout = 0;
  } else if (cleanTaskData.assigneeId) {
    try {
      const assigneeUser = await prisma.user.findUnique({
        where: { id: String(cleanTaskData.assigneeId) },
      });
      if (assigneeUser && assigneeUser.role !== "trainee") {
        cleanTaskData.payout = 0;
      }
    } catch {}
  } else {
    cleanTaskData.payout = 0;
  }

  try {
    // Ensure referenced projectId exists in Prisma DB or pick the first project
    const existingProj = await prisma.project.findUnique({
      where: { id: String(cleanTaskData.projectId) },
    });
    if (!existingProj) {
      const firstProj = await prisma.project.findFirst();
      if (firstProj) {
        cleanTaskData.projectId = firstProj.id;
      }
    }

    const task = await prisma.task.create({
      data: cleanTaskData as any,
      include: {
        project: true,
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        milestone: true,
        proofs: true,
      },
    });
    recordSyncedTaskUpsert(task as unknown as Record<string, unknown>);
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error("Prisma create task error:", err);
    const fallbackTask = {
      ...cleanTaskData,
      id: typeof cleanTaskData.id === "string" && cleanTaskData.id ? cleanTaskData.id : `task-${Date.now()}`,
      proofs: [],
      createdAt: new Date().toISOString(),
    };
    recordSyncedTaskUpsert(fallbackTask);
    return NextResponse.json(fallbackTask, { status: 201 });
  }
}
