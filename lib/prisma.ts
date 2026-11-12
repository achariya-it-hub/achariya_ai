import fs from "fs";
import os from "os";
import path from "path";
import { PrismaClient } from "./generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function resolveSqliteUrl(): string {
  const isServerless =
    Boolean(process.env.NETLIFY) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.VERCEL);

  if (
    process.env.DATABASE_URL &&
    (!isServerless || !process.env.DATABASE_URL.startsWith("file:"))
  ) {
    return process.env.DATABASE_URL;
  }

  const localDbPath = path.join(process.cwd(), "dev.db");

  if (isServerless) {
    const tmpDbPath = path.join(os.tmpdir(), "cwms-dev.db");
    try {
      if (!fs.existsSync(tmpDbPath) && fs.existsSync(localDbPath)) {
        fs.copyFileSync(localDbPath, tmpDbPath);
      }
      if (fs.existsSync(tmpDbPath)) {
        return `file:${tmpDbPath}`;
      }
    } catch (e) {
      console.warn("Could not copy dev.db to tmpdir:", e);
    }
  }
  return "file:dev.db";
}

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({ url: resolveSqliteUrl() });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
