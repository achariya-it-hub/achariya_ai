import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  recordSyncedProjectDelete,
  recordSyncedProjectUpsert,
} from "@/lib/task-sync";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true, avatar: true } },
      members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
      milestones: true,
      tasks: { select: { id: true, status: true, assigneeId: true } },
    },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  try {
    const { memberIds, owner, members, milestones, tasks, createdAt, ...cleanProjectData } = body;

    if (memberIds) {
      await prisma.projectMember.deleteMany({ where: { projectId: id } });
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...cleanProjectData,
        members: memberIds?.length
          ? { create: memberIds.map((userId: string) => ({ userId })) }
          : undefined,
      },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
        milestones: true,
        tasks: { select: { id: true, status: true, assigneeId: true } },
      },
    });
    await recordSyncedProjectUpsert({ ...project, ...(memberIds ? { memberIds } : {}) });
    return NextResponse.json(project);
  } catch (err) {
    console.warn("Prisma update project fallback on serverless:", err);
    const updated = { id, ...body };
    await recordSyncedProjectUpsert(updated);
    return NextResponse.json(updated);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await recordSyncedProjectDelete(id);
  try {
    await prisma.project.delete({ where: { id } });
  } catch {}
  return NextResponse.json({ message: "Project deleted" });
}
