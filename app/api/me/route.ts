import { NextResponse } from "next/server";

import { getDataClient } from "@/utils/dataServerClient";
import { withAuth } from "@/utils/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withAuth(req, async () => {
    const client = getDataClient();

    // 1) Read PROFILE (PK=USER#id, SK=PROFILE)
    const read1 = await client.queries.getMyProfile();
    if (read1.errors?.length) {
      const res = NextResponse.json(
        { ok: false, error: { code: "INTERNAL_ERROR", message: "Failed to read profile" } },
        { status: 500 }
      );
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    if (read1.data) {
      const res = NextResponse.json({ ok: true, data: read1.data }, { status: 200 });
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    // 2) If missing, create default PROFILE (idempotent; does not overwrite)
    const created = await client.mutations.createMyProfile();
    if (created.errors?.length) {
      // Race: another request created it; re-read
      const read2 = await client.queries.getMyProfile();
      if (read2.errors?.length || !read2.data) {
        const res = NextResponse.json(
          { ok: false, error: { code: "INTERNAL_ERROR", message: "Failed to create or read profile" } },
          { status: 500 }
        );
        res.headers.set("Cache-Control", "no-store");
        return res;
      }
      const res = NextResponse.json({ ok: true, data: read2.data }, { status: 200 });
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    const res = NextResponse.json({ ok: true, data: created.data }, { status: 200 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  });
}
