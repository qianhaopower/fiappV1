import { NextResponse } from "next/server";

import { withAuth } from "@/utils/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const resHeaders = { "Cache-Control": "no-store" };

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: resHeaders });
  }

  return withAuth(req, async (user) =>
    NextResponse.json({ ok: true, user }, { status: 200, headers: resHeaders })
  );
}

