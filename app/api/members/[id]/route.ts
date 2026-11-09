import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordSyncedMemberUpsert } from "@/lib/task-sync";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { ownedProjects: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json(user);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const allowed = [
    "name",
    "email",
    "role",
    "avatar",
    "department",
    "title",
    "phone",
    "joinDate",
    "status",
    "attendanceEnabled",
  ];
  const cleanData: Record<string, unknown> = {};
  for (const k of allowed) {
    if (body[k] !== undefined) cleanData[k] = body[k];
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: cleanData as any,
    });
    recordSyncedMemberUpsert({ id, ...cleanData });
    return NextResponse.json(user);
  } catch (err) {
    console.warn("Prisma member update fallback on serverless:", err);
    const updated = { id, ...cleanData };
    recordSyncedMemberUpsert(updated);
    return NextResponse.json(updated);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.task.updateMany({
      where: { assigneeId: id },
      data: { assigneeId: null },
    });

    await prisma.projectMember.deleteMany({
      where: { userId: id },
    });

    await prisma.meetingAttendee.deleteMany({
      where: { userId: id },
    });

    await prisma.attendance.deleteMany({
      where: { userId: id },
    });

    await prisma.activity.deleteMany({
      where: { userId: id },
    });

    await prisma.project.updateMany({
      where: { ownerId: id },
      data: { ownerId: "u1" },
    });

    await prisma.meeting.deleteMany({
      where: { hostId: id },
    });

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ message: "User deleted" });
  } catch (err) {
    console.error("Error deleting user:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
