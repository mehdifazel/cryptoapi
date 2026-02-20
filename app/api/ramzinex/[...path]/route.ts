import { NextRequest, NextResponse } from "next/server";

const RAMZINEX_BASE = "https://publicapi.ramzinex.com";

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathStr = "/" + path.join("/");
  const url = RAMZINEX_BASE + pathStr + (request.nextUrl.search ?? "");
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "Cache-Control": "no-store" },
      cache: "no-store",
    });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
