import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const posts = await prisma.socialPost.findMany({
      orderBy: [
        { scheduledAt: "asc" },
        { createdAt: "desc" },
      ],
    });
    return NextResponse.json(posts);
  } catch (err: any) {
    console.warn("Prisma error fetching social posts:", err);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Support bulk import if array
    if (Array.isArray(body)) {
      const created = await Promise.all(
        body.map(async (item: any) => {
          const scheduled = item.scheduledAt ? new Date(item.scheduledAt) : null;
          const published = item.publishedAt ? new Date(item.publishedAt) : null;

          return prisma.socialPost.create({
            data: {
              title: item.title || "Untitled Post",
              description: item.description || null,
              company: item.company || "Digiventures",
              platform: item.platform || "instagram",
              status: item.status || "idea",
              scheduledAt: scheduled,
              publishedAt: published,
              postUrl: item.postUrl || null,
              createdById: item.createdById || null,
              assigneeId: item.assigneeId || null,
              content: item.content || null,
              mediaUrl: item.mediaUrl || null,
              hashtags: item.hashtags || null,
              isProcessed: Boolean(item.isProcessed),
              reminderInterval: Number(item.reminderInterval) || 30,
            },
          });
        })
      );
      return NextResponse.json(created, { status: 201 });
    }

    // Single post creation
    const scheduled = body.scheduledAt ? new Date(body.scheduledAt) : null;
    const published = body.publishedAt ? new Date(body.publishedAt) : null;

    const post = await prisma.socialPost.create({
      data: {
        title: body.title || "Untitled Post",
        description: body.description || null,
        company: body.company || "Digiventures",
        platform: body.platform || "instagram",
        status: body.status || "idea",
        scheduledAt: scheduled,
        publishedAt: published,
        postUrl: body.postUrl || null,
        createdById: body.createdById || null,
        assigneeId: body.assigneeId || null,
        content: body.content || null,
        mediaUrl: body.mediaUrl || null,
        hashtags: body.hashtags || null,
        isProcessed: Boolean(body.isProcessed),
        reminderInterval: Number(body.reminderInterval) || 30,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (err: any) {
    console.error("Error creating social post:", err);
    return NextResponse.json({ error: err.message || "Failed to create post" }, { status: 500 });
  }
}
