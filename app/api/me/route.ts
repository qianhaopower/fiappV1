import { NextResponse } from "next/server";

import { createDynamoClient } from "@/utils/dynamoClient";
import { withAuth } from "@/utils/authServer";
import { trackEvent } from "@/utils/metricsClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfileItem = {
  PK: string;
  SK: string;
  userId: string;
  subscriptionStatus: string;
  createdAt: string;
  updatedAt: string;
  activePracticeIds?: string[];
  latestAssessmentId?: string | null;
  focusPillar?: string | null;
  lowestPillarId?: string | null;
  returnCounters?: Record<string, unknown>;
  milestonesAchieved?: string[];
  timezone?: string;
  dayResetTime?: number;
};

function stripKeys(item: ProfileItem) {
  const profile: Partial<ProfileItem> = { ...item };
  delete profile.PK;
  delete profile.SK;
  return profile as Omit<ProfileItem, "PK" | "SK">;
}

function jsonWithNoStore(body: unknown, status: number) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(req: Request) {
  return withAuth(req, async (user) => {
    const client = createDynamoClient();
    const profileKey = { PK: `USER#${user.userId}`, SK: "PROFILE" };

    const existing = await client.getItem<ProfileItem>(profileKey);

    if (existing) {
      // Lazy backfill of the admin user-list index. Profiles created before
      // the index existed get registered on first read; idempotent for
      // anyone already indexed. Best-effort — failures log but don't break
      // the /me read.
      client
        .putItemIfNotExists({
          PK: "USERS",
          SK: `INDEX#${user.userId}`,
          userId: user.userId,
          createdAt: existing.createdAt ?? new Date().toISOString(),
        })
        .catch((e) => console.error("[GET /api/me] users index backfill failed:", e));

      return jsonWithNoStore({ ok: true, data: stripKeys(existing) }, 200);
    }

    // Profile missing — create default (idempotent via condition on PK)
    const now = new Date().toISOString();
    const newItem: ProfileItem = {
      ...profileKey,
      userId: user.userId,
      subscriptionStatus: "FREE",
      createdAt: now,
      updatedAt: now,
      activePracticeIds: [],
      latestAssessmentId: null,
      focusPillar: null,
      lowestPillarId: null,
      returnCounters: {},
      milestonesAchieved: [],
    };

    const created = await client.putItemIfNotExists(newItem);

    if (!created) {
      // Race: another request created it first — re-read
      const reread = await client.getItem<ProfileItem>(profileKey);
      if (!reread) {
        console.error("[GET /api/me] profile reread after race failed");
        return jsonWithNoStore(
          { ok: false, error: { code: "INTERNAL_ERROR", message: "Failed to create or read profile" } },
          500
        );
      }
      return jsonWithNoStore({ ok: true, data: stripKeys(reread) }, 200);
    }

    // Index entry for the admin user-list view. Idempotent and best-effort —
    // if the write fails the profile is still valid; the user just won't show
    // up in /admin until backfill runs.
    client
      .putItemIfNotExists({
        PK: "USERS",
        SK: `INDEX#${user.userId}`,
        userId: user.userId,
        createdAt: now,
      })
      .catch((e) => console.error("[GET /api/me] users index write failed:", e));

    trackEvent("totalUsers", "newUsers");
    return jsonWithNoStore({ ok: true, data: stripKeys(newItem) }, 200);
  });
}

export async function PATCH(req: Request) {
  return withAuth(req, async (user) => {
    let body: { timezone?: string; dayResetTime?: number }
    try {
      body = (await req.json()) as { timezone?: string; dayResetTime?: number }
    } catch {
      return jsonWithNoStore({ error: "Invalid JSON" }, 400);
    }

    const { timezone, dayResetTime } = body ?? {}
    const updates: Record<string, unknown> = {}

    if (timezone !== undefined) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone })
      } catch {
        return jsonWithNoStore({ error: "Invalid timezone" }, 400);
      }
      updates.timezone = timezone
    }

    if (dayResetTime !== undefined) {
      if (typeof dayResetTime !== "number" || !Number.isInteger(dayResetTime) || dayResetTime < 0 || dayResetTime > 1439) {
        return jsonWithNoStore({ error: "dayResetTime must be an integer 0–1439" }, 400);
      }
      updates.dayResetTime = dayResetTime
    }

    if (Object.keys(updates).length === 0) {
      return jsonWithNoStore({ ok: true }, 200);
    }

    const keys = Object.keys(updates)
    const client = createDynamoClient()
    await client.updateItem({
      Key: { PK: `USER#${user.userId}`, SK: "PROFILE" },
      UpdateExpression: `SET ${keys.map((k, i) => `#a${i} = :v${i}`).join(", ")}`,
      ExpressionAttributeNames: Object.fromEntries(keys.map((k, i) => [`#a${i}`, k])),
      ExpressionAttributeValues: Object.fromEntries(keys.map((k, i) => [`:v${i}`, updates[k]])),
    })

    return jsonWithNoStore({ ok: true }, 200);
  });
}
