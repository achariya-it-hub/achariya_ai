import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

export async function GET() {
  const records = await prisma.attendance.findMany({
    orderBy: { clockInAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true, avatar: true, role: true, attendanceEnabled: true } } },
  });
  return NextResponse.json(records);
}

export async function POST(request: Request) {
  const authed = await getUser();
  if (!authed) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const action: string = body?.action || "in";
  const targetId: string | undefined = body?.userId;

  const isManager = authed.role === "admin" || authed.role === "manager";
  const userId = targetId && isManager ? targetId : authed.id;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (user.attendanceEnabled === false && userId === authed.id) {
    return NextResponse.json({ error: "Attendance is disabled for your account" }, { status: 403 });
  }

  if (action === "out") {
    const open = await prisma.attendance.findFirst({
      where: { userId, clockOutAt: null },
      orderBy: { clockInAt: "desc" },
    });
    if (!open) {
      return NextResponse.json({ error: "No open clock-in to clock out" }, { status: 400 });
    }
    const record = await prisma.attendance.update({
      where: { id: open.id },
      data: { clockOutAt: new Date() },
      include: { user: { select: { id: true, name: true, email: true, avatar: true, role: true, attendanceEnabled: true } } },
    });
    return NextResponse.json(record);
  }

  const existingOpen = await prisma.attendance.findFirst({
    where: { userId, clockOutAt: null },
  });
  if (existingOpen) {
    return NextResponse.json({ error: "Already clocked in" }, { status: 400 });
  }

  const record = await prisma.attendance.create({
    data: { userId, clockInAt: new Date() },
    include: { user: { select: { id: true, name: true, email: true, avatar: true, role: true, attendanceEnabled: true } } },
  });
  return NextResponse.json(record, { status: 201 });
}