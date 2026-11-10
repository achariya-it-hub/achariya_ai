import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { seedMembers } from "@/lib/data";
import { isMemberDeleted, mergeMembersWithSyncState } from "@/lib/task-sync";
import { signToken, verifyToken, COOKIE_NAME } from "./jwt";
import type { JWTPayload } from "./jwt";

export { signToken, verifyToken, COOKIE_NAME };
export type { JWTPayload };

export async function getUser(): Promise<JWTPayload | null> {
  try {
    const headerStore = await headers();
    const authHeader = headerStore.get("authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      const bearerToken = authHeader.slice(7).trim();
      if (bearerToken) {
        const verified = await verifyToken(bearerToken);
        if (verified) return verified;
      }
    }
  } catch {}

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function authenticate(emailInput: string, password: string): Promise<JWTPayload | null> {
  const clean = emailInput.trim().toLowerCase();
  const cleanNoDash = clean.replace(/[-_\s]/g, "");

  // Match by Employee ID, email, username, or ID from live synced members + seedMembers
  const liveRoster = await mergeMembersWithSyncState(seedMembers);
  const candidate = liveRoster.find(
    (m) =>
      (m.employeeId && m.employeeId.toLowerCase() === clean) ||
      (m.employeeId && m.employeeId.toLowerCase().replace(/[-_\s]/g, "") === cleanNoDash) ||
      m.email.toLowerCase() === clean ||
      m.id.toLowerCase() === clean ||
      m.name.toLowerCase() === clean ||
      m.email.split("@")[0].toLowerCase() === clean
  );
  const matchedMember =
    candidate && !(await isMemberDeleted(candidate.id)) ? candidate : undefined;

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
    if (member && !(await isMemberDeleted(member.id))) {
      const normalizedMemberEmail =
        member.email.endsWith("@cwms.local") ||
        member.email.endsWith("@achariya.in") ||
        member.email.endsWith("@achariya.org") ||
        member.email.endsWith("@digital-crm.com")
          ? `${member.email.split("@")[0].toLowerCase()}@achariya.ai`
          : member.email;
      return { id: member.id, email: normalizedMemberEmail, name: member.name, avatar: member.avatar ?? undefined, role: member.role };
    }
  } catch (err) {
    console.warn("Prisma DB lookup error on serverless lambda, falling back to seed members:", err);
  }

  // In-memory / synced fallback
  if (matchedMember && !(await isMemberDeleted(matchedMember.id))) {
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
