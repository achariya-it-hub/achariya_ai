import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; proofId: string }> }
) {
  const { id, proofId } = await params;
  await prisma.taskProof.deleteMany({ where: { id: proofId, taskId: id } });
  return NextResponse.json({ message: "Proof deleted" });
}