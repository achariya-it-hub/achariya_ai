import { NextRequest, NextResponse } from "next/server";

function isLocalDevOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");
  const res = NextResponse.next();

  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Cookie");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  if (isLocalDevOrigin(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Vary", "Origin");
    res.headers.set("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: res.headers });
  }

  return res;
}

export const config = {
  matcher: "/api/:path*",
};
