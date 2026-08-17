import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedData } from "@/lib/data";

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
      return NextResponse.json(projects);
    }
  } catch (err) {
    console.warn("Prisma error fetching projects on Netlify lambda, falling back to seedData:", err);
  }

  return NextResponse.json(seedData.projects);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { memberIds, owner, members, milestones, tasks, createdAt, ...cleanProjectData } = body;

  try {
    const project = await prisma.project.create({
      data: {
        ...cleanProjectData,
        members: memberIds?.length
          ? { create: memberIds.map((userId: string) => ({ userId })) }
          : undefined,
      },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
      },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error("Prisma create project error:", err);
    const fallbackProject = { ...cleanProjectData, id: `p-${Date.now()}`, memberIds: memberIds || [], createdAt: new Date().toISOString() };
    return NextResponse.json(fallbackProject, { status: 201 });
  }
}
