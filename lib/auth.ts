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
  
  // Normalize alias emails (e.g. ram@achariya.ai -> ramkumar@achariya.ai, adhithya@achariya.ai -> adhi@achariya.ai)
  let normalizedEmail = clean;
  if (!clean.includes("@")) {
    if (clean === "ram") normalizedEmail = "ramkumar@achariya.ai";
    else if (clean === "adhithya") normalizedEmail = "adhi@achariya.ai";
    else normalizedEmail = `${clean}@achariya.ai`;
  } else if (clean === "ram@achariya.ai") {
    normalizedEmail = "ramkumar@achariya.ai";
  } else if (clean === "adhithya@achariya.ai") {
    normalizedEmail = "adhi@achariya.ai";
  }

  try {
    const member = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { email: clean },
        ],
      },
    });
    if (member) {
      return { id: member.id, email: member.email, name: member.name, avatar: member.avatar ?? undefined, role: member.role };
    }
  } catch (err) {
    console.warn("Prisma DB lookup error on serverless lambda, falling back to seed members:", err);
  }

  // Fallback in-memory auth for Netlify serverless environment
  const fallback = seedMembers.find(
    (m) =>
      m.email.toLowerCase() === normalizedEmail ||
      m.email.toLowerCase() === clean ||
      m.name.toLowerCase() === clean ||
      m.email.split("@")[0].toLowerCase() === clean ||
      m.id.toLowerCase() === clean
  );

  if (fallback) {
    return {
      id: fallback.id,
      email: fallback.email,
      name: fallback.name,
      avatar: fallback.avatar,
      role: fallback.role,
    };
  }

  return null;
}
