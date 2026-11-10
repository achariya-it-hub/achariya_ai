import { NextResponse } from "next/server";
import { getUser, signToken, COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { seedMembers } from "@/lib/data";
import {
  mergeMembersWithSyncState,
  recordSyncedMemberUpsert,
} from "@/lib/task-sync";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const syncedList = await mergeMembersWithSyncState(seedMembers);
  const syncedMember = syncedList.find(
    (m) => m.id === user.id || m.email.toLowerCase() === user.email.toLowerCase()
  );
  return NextResponse.json({
    user: {
      ...user,
      name: syncedMember?.name || user.name,
      email: syncedMember?.email || user.email,
      avatar: syncedMember?.avatar ?? user.avatar,
      department: syncedMember?.department,
      title: syncedMember?.title,
      phone: syncedMember?.phone,
    },
  });
}

export async function PUT(request: Request) {
  const user = await getUser();
  const body = (await request.json()) as Record<string, unknown>;
  const targetId = String(body.id || user?.id || "");
  if (!targetId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const allowedFields = ["name", "email", "phone", "department", "title", "avatar"];
  const prismaData: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (typeof body[key] === "string") {
      prismaData[key] = (body[key] as string).trim();
    }
  }
  if (typeof body.newPassword === "string" && body.newPassword.trim().length >= 4) {
    prismaData.password = body.newPassword.trim();
  }

  let updatedRecord: Record<string, unknown> = {
    id: targetId,
    ...prismaData,
  };

  try {
    const dbUser = await prisma.user.update({
      where: { id: targetId },
      data: prismaData as any,
    });
    updatedRecord = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      avatar: dbUser.avatar,
      department: dbUser.department,
      title: dbUser.title,
      phone: dbUser.phone,
      status: dbUser.status,
    };
  } catch (err) {
    console.warn("Prisma user profile update fallback on serverless:", err);
  }

  await recordSyncedMemberUpsert(updatedRecord);

  const nextJwtUser = {
    id: targetId,
    name: String(updatedRecord.name || user?.name || ""),
    email: String(updatedRecord.email || user?.email || ""),
    role: String(updatedRecord.role || user?.role || "member"),
    avatar: updatedRecord.avatar ? String(updatedRecord.avatar) : user?.avatar,
  };

  const token = await signToken(nextJwtUser);
  const response = NextResponse.json({
    token,
    user: {
      ...nextJwtUser,
      department: updatedRecord.department,
      title: updatedRecord.title,
      phone: updatedRecord.phone,
    },
    member: updatedRecord,
  });

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return response;
}
