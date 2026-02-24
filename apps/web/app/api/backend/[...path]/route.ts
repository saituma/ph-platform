import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const rawBase = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const apiBase = rawBase.replace(/\/api\/?$/, "");

async function forward(req: NextRequest) {
  if (!apiBase) {
    return NextResponse.json({ error: "API base URL not configured" }, { status: 500 });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace("/api/backend", "");
  const target = `${apiBase}/api${path}${url.search}`;

  const accessToken = req.cookies.get("accessToken")?.value ?? req.cookies.get("accessTokenClient")?.value;
  const forwardedAuth = req.headers.get("authorization") ?? "";

  const res = await fetch(target, {
    method: req.method,
    headers: {
      "Content-Type": req.headers.get("content-type") ?? "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(forwardedAuth ? { Authorization: forwardedAuth } : {}),
    },
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.text(),
    cache: "no-store",
  });

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function GET(req: NextRequest) {
  return forward(req);
}

export async function POST(req: NextRequest) {
  return forward(req);
}

export async function PUT(req: NextRequest) {
  return forward(req);
}

export async function PATCH(req: NextRequest) {
  return forward(req);
}

export async function DELETE(req: NextRequest) {
  return forward(req);
}
