import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedData } from "@/lib/data";
import {
  mergeProjectsWithSyncState,
  recordSyncedProjectUpsert,
} from "@/lib/task-sync";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
        milestones: true,
        tasks: { select: { id: true, status: true, assigneeId: true } },
      },
    });

    if (projects && projects.length > 0) {
      return NextResponse.json(await mergeProjectsWithSyncState(projects));
    }
  } catch (err) {
    console.warn("Prisma error fetching projects on Netlify lambda, falling back to seedData:", err);
  }

  return NextResponse.json(await mergeProjectsWithSyncState(seedData.projects));
}

export async function POST(request: Request) {
  const body = await request.json();
  const { memberIds, owner, members, milestones, tasks, createdAt, ...cleanProjectData } = body;
  const targetId = cleanProjectData.id || `p-${Date.now()}`;

  try {
    const project = await prisma.project.create({
      data: {
        ...cleanProjectData,
        id: targetId,
        startDate: cleanProjectData.startDate || new Date().toISOString().slice(0, 10),
        endDate: cleanProjectData.endDate || new Date().toISOString().slice(0, 10),
        ownerId: cleanProjectData.ownerId || "u1",
        members: memberIds?.length
          ? { create: memberIds.map((userId: string) => ({ userId })) }
          : undefined,
      },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
      },
    });
    await recordSyncedProjectUpsert({ ...project, memberIds: memberIds || [] });
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error("Prisma create project error:", err);
    const fallbackProject = {
      ...cleanProjectData,
      id: targetId,
      memberIds: memberIds || [],
      createdAt: new Date().toISOString(),
    };
    await recordSyncedProjectUpsert(fallbackProject);
    return NextResponse.json(fallbackProject, { status: 201 });
  }
}
