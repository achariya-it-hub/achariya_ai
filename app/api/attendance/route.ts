import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";
import { seedMembers } from "@/lib/data";
import {
  getSyncedAttendance,
  mergeMembersWithSyncState,
  recordSyncedAttendance,
} from "@/lib/task-sync";

export async function GET() {
  try {
    const records = await prisma.attendance.findMany({
      orderBy: { clockInAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true, avatar: true, role: true, attendanceEnabled: true } } },
    });
    return NextResponse.json(await getSyncedAttendance(records));
  } catch {
    return NextResponse.json(await getSyncedAttendance([]));
  }
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

  let userSummary: any = null;
  try {
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (dbUser) userSummary = dbUser;
  } catch {}
  if (!userSummary) {
    const allMembers = await mergeMembersWithSyncState(seedMembers);
    userSummary = allMembers.find((m) => m.id === userId) || authed;
  }

  if (userSummary?.attendanceEnabled === false && userId === authed.id) {
    return NextResponse.json({ error: "Attendance is disabled for your account" }, { status: 403 });
  }

  if (action === "out") {
    try {
      const open = await prisma.attendance.findFirst({
        where: { userId, clockOutAt: null },
        orderBy: { clockInAt: "desc" },
      });
      if (open) {
        const record = await prisma.attendance.update({
          where: { id: open.id },
          data: { clockOutAt: new Date() },
          include: { user: { select: { id: true, name: true, email: true, avatar: true, role: true, attendanceEnabled: true } } },
        });
        await recordSyncedAttendance(record as unknown as Record<string, unknown>);
        return NextResponse.json(record);
      }
    } catch {}

    const synced = await getSyncedAttendance<any>([]);
    const openCloud = synced.find((r) => r.userId === userId && !r.clockOutAt);
    if (!openCloud) {
      return NextResponse.json({ error: "No open clock-in to clock out" }, { status: 400 });
    }
    const updatedCloud = { ...openCloud, clockOutAt: new Date().toISOString() };
    await recordSyncedAttendance(updatedCloud);
    return NextResponse.json(updatedCloud);
  }

  try {
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
    await recordSyncedAttendance(record as unknown as Record<string, unknown>);
    return NextResponse.json(record, { status: 201 });
  } catch {
    const fallbackRecord = {
      id: `att-${Date.now()}`,
      userId,
      clockInAt: new Date().toISOString(),
      clockOutAt: null,
      user: {
        id: userSummary.id,
        name: userSummary.name,
        email: userSummary.email,
        avatar: userSummary.avatar,
        role: userSummary.role,
        attendanceEnabled: true,
      },
    };
    await recordSyncedAttendance(fallbackRecord);
    return NextResponse.json(fallbackRecord, { status: 201 });
  }
}