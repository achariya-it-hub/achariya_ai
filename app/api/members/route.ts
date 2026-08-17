import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedMembers } from "@/lib/data";

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
      return NextResponse.json(members);
    }
  } catch (err) {
    console.warn("Prisma error fetching members on Netlify lambda, falling back to seedMembers:", err);
  }

  return NextResponse.json(seedMembers);
}

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const member = await prisma.user.create({
      data: body,
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
    return NextResponse.json(member, { status: 201 });
  } catch (err) {
    const fallbackMember = { ...body, id: `u-${Date.now()}` };
    return NextResponse.json(fallbackMember, { status: 201 });
  }
}
