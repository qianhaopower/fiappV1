import { NextResponse } from "next/server";
import { getDataClient } from "@/utils/dataServerClient";
import { withAuth } from "@/utils/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { subscriptionStatus: "FREE" | "PAID" };

export async function POST(req: Request) {
  const resHeaders = { "Cache-Control": "no-store" };

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: resHeaders });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: resHeaders });
  }

  if (body.subscriptionStatus !== "FREE" && body.subscriptionStatus !== "PAID") {
    return NextResponse.json(
      { error: "subscriptionStatus must be FREE or PAID" },
      { status: 400, headers: resHeaders }
    );
  }

  return withAuth(req, async (auth) => {
    const client = getDataClient();
    const before = await client.queries.getMyProfile();
    const mutation = await client.mutations.setMySubscriptionStatus({
      subscriptionStatus: body.subscriptionStatus,
    });
    const after = await client.queries.getMyProfile();

    return NextResponse.json(
      {
        ok: true,
        auth,
        requested: body.subscriptionStatus,
        before: { data: before.data, errors: before.errors ?? null },
        mutation: { data: mutation.data, errors: mutation.errors ?? null },
        after: { data: after.data, errors: after.errors ?? null },
      },
      { status: 200, headers: resHeaders }
    );
  });
}
