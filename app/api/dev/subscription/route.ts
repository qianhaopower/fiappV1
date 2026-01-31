import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";
import { getCurrentUser } from "aws-amplify/auth/server";
import { getDataClient } from "@/utils/dataServerClient";

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

  try {
    // 1) Prove what identity the SERVER sees
    const auth = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        const u = await getCurrentUser(contextSpec);
        return { userId: u.userId, username: u.username };
      },
    });

    const client = getDataClient();

    // 2) Read BEFORE
    const before = await client.queries.getMyProfile();

    // 3) Mutate
    const mutation = await client.mutations.setMySubscriptionStatus({
      subscriptionStatus: body.subscriptionStatus,
    });

    // 4) Read AFTER
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
  } catch (e) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: resHeaders });
  }
}
