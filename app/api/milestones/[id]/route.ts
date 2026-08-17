import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const milestone = await prisma.milestone.findUnique({
    where: { id },
    include: { project: true },
  });
  if (!milestone) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }
  return NextResponse.json(milestone);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { project, tasks, ...cleanMilestoneData } = body;
    const milestone = await prisma.milestone.update({
      where: { id },
      data: cleanMilestoneData,
      include: { project: true },
    });
    return NextResponse.json(milestone);
  } catch (err) {
    console.error("Prisma update milestone error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.milestone.delete({ where: { id } });
  return NextResponse.json({ message: "Milestone deleted" });
}
