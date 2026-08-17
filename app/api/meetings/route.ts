import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedData } from "@/lib/data";

export async function GET() {
  try {
    const meetings = await prisma.meeting.findMany({
      include: {
        host: { select: { id: true, name: true, email: true, avatar: true } },
        attendees: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
      },
    });

    if (meetings && meetings.length > 0) {
      return NextResponse.json(meetings);
    }
  } catch (err) {
    console.warn("Prisma error fetching meetings on Netlify lambda, falling back to seedData:", err);
  }

  return NextResponse.json(seedData.meetings);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { attendeeIds, ...meetingData } = body;

  try {
    const meeting = await prisma.meeting.create({
      data: {
        ...meetingData,
        roomName: `room-${Date.now()}`,
        attendees: attendeeIds?.length
          ? { create: attendeeIds.map((userId: string) => ({ userId })) }
          : undefined,
      },
      include: {
        host: { select: { id: true, name: true, email: true, avatar: true } },
        attendees: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
      },
    });
    return NextResponse.json(meeting, { status: 201 });
  } catch (err) {
    const fallbackMeeting = { ...meetingData, id: `mt-${Date.now()}`, roomName: `room-${Date.now()}`, attendeeIds: attendeeIds || [] };
    return NextResponse.json(fallbackMeeting, { status: 201 });
  }
}
