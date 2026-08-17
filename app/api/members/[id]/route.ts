import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  const body = await request.json();
  const user = await prisma.user.update({
    where: { id },
    data: body,
  });
  return NextResponse.json(user);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Unassign user from tasks
    await prisma.task.updateMany({
      where: { assigneeId: id },
      data: { assigneeId: null },
    });

    // Delete user's project member entries
    await prisma.projectMember.deleteMany({
      where: { userId: id },
    });

    // Delete meeting attendee entries
    await prisma.meetingAttendee.deleteMany({
      where: { userId: id },
    });

    // Delete attendance records
    await prisma.attendance.deleteMany({
      where: { userId: id },
    });

    // Delete activity records
    await prisma.activity.deleteMany({
      where: { userId: id },
    });

    // Reassign owned projects if any
    await prisma.project.updateMany({
      where: { ownerId: id },
      data: { ownerId: "u1" },
    });

    // Delete hosted meetings if any
    await prisma.meeting.deleteMany({
      where: { hostId: id },
    });

    // Delete the user record
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ message: "User deleted" });
  } catch (err) {
    console.error("Error deleting user:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
