import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";
import { getCurrentUser } from "aws-amplify/auth/server";
import { getDataClient } from "@/utils/dataServerClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1) Server-verified identity
    const { user } = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        const u = await getCurrentUser(contextSpec);
        return {
          user: { userId: u.userId, username: u.username },
        };
      },
    });

    const client = getDataClient();

    // 2) Read profile
    const read1 = await client.queries.getMyProfile();
    if (read1.errors?.length) {
      const res = NextResponse.json({ error: read1.errors }, { status: 500 });
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    if (read1.data) {
      const res = NextResponse.json({ user, profile: read1.data }, { status: 200 });
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    // 3) Create profile if missing
    const created = await client.mutations.createMyProfile();
    if (created.errors?.length) {
      // handle race/conditional by re-reading once
      const read2 = await client.queries.getMyProfile();
      if (read2.errors?.length) {
        const res = NextResponse.json({ error: read2.errors }, { status: 500 });
        res.headers.set("Cache-Control", "no-store");
        return res;
      }

      const res = NextResponse.json({ user, profile: read2.data }, { status: 200 });
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    const res = NextResponse.json({ user, profile: created.data }, { status: 200 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}
