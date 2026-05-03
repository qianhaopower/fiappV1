import { NextResponse } from "next/server";

import { getDataClient } from "@/utils/dataServerClient";
import { createDynamoClient } from "@/utils/dynamoClient";
import { withAuth } from "@/utils/authServer";
import { isTrialActive, type TrialItem } from "@/lib/practices/trial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonWithNoStore(body: unknown, status: number) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

async function getActiveTrialCount(userId: string): Promise<number> {
  const client = createDynamoClient();
  const trials = await client.query<TrialItem>({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: { ":pk": `USER#${userId}`, ":prefix": "TRIAL#" },
  });
  return trials.filter(isTrialActive).length;
}

export async function GET(req: Request) {
  return withAuth(req, async (user) => {
    const client = getDataClient();

    const [profileResult, activeTrialCount] = await Promise.all([
      client.queries.getMyProfile(),
      getActiveTrialCount(user.userId),
    ]);

    if (profileResult.errors?.length) {
      return jsonWithNoStore(
        { ok: false, error: { code: "INTERNAL_ERROR", message: "Failed to read profile" } },
        500
      );
    }

    if (profileResult.data) {
      return jsonWithNoStore(
        { ok: true, data: { ...profileResult.data, activeTrialCount } },
        200
      );
    }

    // Profile missing — create default (idempotent)
    const created = await client.mutations.createMyProfile();
    if (created.errors?.length) {
      // Race: re-read
      const read2 = await client.queries.getMyProfile();
      if (read2.errors?.length || !read2.data) {
        return jsonWithNoStore(
          { ok: false, error: { code: "INTERNAL_ERROR", message: "Failed to create or read profile" } },
          500
        );
      }
      return jsonWithNoStore({ ok: true, data: { ...read2.data, activeTrialCount } }, 200);
    }

    return jsonWithNoStore({ ok: true, data: { ...created.data, activeTrialCount } }, 200);
  });
}
