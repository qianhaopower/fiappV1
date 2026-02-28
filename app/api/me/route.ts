import { NextResponse } from "next/server";

import { getDataClient } from "@/utils/dataServerClient";
import {
  getUserId,
  isUnauthorizedError,
  unauthorizedResponse,
} from "@/utils/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1) Server-verified identity (canonical helper)
    const user = await getUserId(req);

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
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse();
    }

    // Preserve existing behavior for now: treat unexpected errors as unauthorized.
    return unauthorizedResponse();
  }
}
