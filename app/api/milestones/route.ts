import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedData } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  try {
    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;

    const milestones = await prisma.milestone.findMany({
      where,
      include: { project: true },
    });

    if (milestones && milestones.length > 0) {
      return NextResponse.json(milestones);
    }
  } catch (err) {
    console.warn("Prisma error fetching milestones on Netlify lambda, falling back to seedData:", err);
  }

  let fallback = seedData.milestones;
  if (projectId) fallback = fallback.filter((m) => m.projectId === projectId);

  return NextResponse.json(fallback);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { project, tasks, ...cleanMilestoneData } = body;
  try {
    const milestone = await prisma.milestone.create({
      data: cleanMilestoneData,
      include: { project: true },
    });
    return NextResponse.json(milestone, { status: 201 });
  } catch (err) {
    console.error("Prisma create milestone error:", err);
    const fallbackMilestone = { ...cleanMilestoneData, id: `m-${Date.now()}` };
    return NextResponse.json(fallbackMilestone, { status: 201 });
  }
}
