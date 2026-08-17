import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name).slice(0, 12) || ".bin";
    const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), bytes);
    return NextResponse.json({ url: `/uploads/${name}`, name: file.name });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}