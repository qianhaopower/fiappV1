import { NextResponse } from "next/server";

import { getUserId, isUnauthorizedError, unauthorizedResponse } from "@/utils/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const resHeaders = { "Cache-Control": "no-store" };

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: resHeaders });
  }

  try {
    const user = await getUserId(req);

    return NextResponse.json(
      {
        ok: true,
        user,
      },
      { status: 200, headers: resHeaders },
    );
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse();
    }

    return unauthorizedResponse();
  }
}

