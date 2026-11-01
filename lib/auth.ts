import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { seedMembers } from "@/lib/data";
import { signToken, verifyToken, COOKIE_NAME } from "./jwt";
import type { JWTPayload } from "./jwt";

export { signToken, verifyToken, COOKIE_NAME };
export type { JWTPayload };


export async function getUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function authenticate(emailInput: string, password: string): Promise<JWTPayload | null> {
  const clean = emailInput.trim().toLowerCase();
  const cleanNoDash = clean.replace(/[-_\s]/g, "");

  // Match by Employee ID, email, username, or ID from seedMembers
  const matchedMember = seedMembers.find(
    (m) =>
      (m.employeeId && m.employeeId.toLowerCase() === clean) ||
      (m.employeeId && m.employeeId.toLowerCase().replace(/[-_\s]/g, "") === cleanNoDash) ||
      m.email.toLowerCase() === clean ||
      m.id.toLowerCase() === clean ||
      m.name.toLowerCase() === clean ||
      m.email.split("@")[0].toLowerCase() === clean
  );

  let normalizedEmail = matchedMember ? matchedMember.email.toLowerCase() : clean;
  if (!normalizedEmail.includes("@")) {
    if (normalizedEmail === "ram") normalizedEmail = "ramkumar@achariya.ai";
    else if (normalizedEmail === "adhithya") normalizedEmail = "adhi@achariya.ai";
    else normalizedEmail = `${normalizedEmail}@achariya.ai`;
  } else if (normalizedEmail === "ram@achariya.ai") {
    normalizedEmail = "ramkumar@achariya.ai";
  } else if (normalizedEmail === "adhithya@achariya.ai") {
    normalizedEmail = "adhi@achariya.ai";
  }

  try {
    const member = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { email: clean },
          ...(matchedMember ? [{ id: matchedMember.id }] : []),
        ],
      },
    });
    if (member) {
      return { id: member.id, email: member.email, name: member.name, avatar: member.avatar ?? undefined, role: member.role };
    }
  } catch (err) {
    console.warn("Prisma DB lookup error on serverless lambda, falling back to seed members:", err);
  }

  // In-memory fallback
  if (matchedMember) {
    return {
      id: matchedMember.id,
      email: matchedMember.email,
      name: matchedMember.name,
      avatar: matchedMember.avatar,
      role: matchedMember.role,
    };
  }

  return null;
}
