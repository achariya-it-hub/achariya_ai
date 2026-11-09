import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedMembers } from "@/lib/data";
import {
  mergeMembersWithSyncState,
  recordSyncedMemberUpsert,
  sanitizeUserForPrisma,
} from "@/lib/task-sync";

export async function GET() {
  try {
    const members = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        department: true,
        title: true,
        phone: true,
        joinDate: true,
        status: true,
      },
    });

    if (members && members.length > 0) {
      return NextResponse.json(mergeMembersWithSyncState(members));
    }
  } catch (err) {
    console.warn("Prisma error fetching members on Netlify lambda, falling back to seedMembers:", err);
  }

  return NextResponse.json(mergeMembersWithSyncState(seedMembers));
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const prismaData = sanitizeUserForPrisma(body);
  const targetId = prismaData.id || `u-${Date.now()}`;
  const employeeId =
    typeof body.employeeId === "string" && body.employeeId.trim()
      ? body.employeeId.trim()
      : `${prismaData.role === "trainee" ? "TRN" : "EMP"}-${String(
          Math.floor(100 + Math.random() * 900)
        )}`;

  try {
    const member = await prisma.user.upsert({
      where: { email: prismaData.email },
      update: {
        name: prismaData.name,
        role: prismaData.role,
        avatar: prismaData.avatar,
        department: prismaData.department,
        title: prismaData.title,
        phone: prismaData.phone,
        joinDate: prismaData.joinDate,
        status: prismaData.status,
        ...(typeof body.password === "string" && body.password.trim()
          ? { password: body.password.trim() }
          : {}),
      },
      create: {
        ...prismaData,
        id: targetId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        department: true,
        title: true,
        phone: true,
        joinDate: true,
        status: true,
      },
    });

    const enriched = {
      ...member,
      employeeId,
      ...(typeof body.password === "string" ? { password: body.password } : {}),
    };
    recordSyncedMemberUpsert(enriched as unknown as Record<string, unknown>);
    return NextResponse.json(enriched, { status: 201 });
  } catch (err) {
    console.warn("Prisma member create fallback on serverless:", err);
    const fallbackMember = {
      ...prismaData,
      id: targetId,
      employeeId,
    };
    recordSyncedMemberUpsert(fallbackMember);
    return NextResponse.json(fallbackMember, { status: 201 });
  }
}
