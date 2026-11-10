import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";
import { recordSyncedMemberUpsert } from "@/lib/task-sync";

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 4) {
      return NextResponse.json(
        { error: "New password must be at least 4 characters long" },
        { status: 400 }
      );
    }

    // Check user in database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (dbUser && dbUser.password && currentPassword) {
      if (dbUser.password !== currentPassword.trim()) {
        return NextResponse.json(
          { error: "Current password does not match" },
          { status: 400 }
        );
      }
    }

    // Update password in database and cloud sync
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: newPassword.trim() },
      });
    } catch {}
    await recordSyncedMemberUpsert({ id: user.id, password: newPassword.trim() });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json(
      { error: "Failed to update password. Please try again." },
      { status: 500 }
    );
  }
}
