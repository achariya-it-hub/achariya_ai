import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  const proof = await prisma.taskProof.create({
    data: { taskId: id, name: body.name || null, url: body.url, type: body.type || "link" },
  });
  return NextResponse.json(proof, { status: 201 });
}