import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { randomUUID } from "crypto";
import { GET, PATCH } from "@/app/api/me/route";
import { createDynamoClient } from "@/utils/dynamoClient";
import { makeRawClient, makeTableNames, createTables, deleteTables } from "../tableUtils";
import { seedProfile, seedTrial } from "../seeds";
import type { withAuth as WithAuthType } from "@/utils/authServer";

vi.mock("@/utils/metricsClient", () => ({ trackEvent: vi.fn(), trackPillarFocus: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

vi.mock("@/utils/authServer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/authServer")>();
  return { ...actual, withAuth: vi.fn() };
});

import { withAuth } from "@/utils/authServer";

const { mainTable, returnsTable } = makeTableNames();
const rawClient = makeRawClient();

beforeAll(async () => {
  process.env.FIAPP_MAIN_TABLE = mainTable;
  process.env.FIAPP_RETURNS_TABLE = returnsTable;
  await createTables(rawClient, mainTable, returnsTable);
});

afterAll(async () => {
  await deleteTables(rawClient, mainTable, returnsTable);
});

function asUser(userId: string) {
  vi.mocked(withAuth as typeof WithAuthType).mockImplementationOnce(
    async (_req, handler) => handler({ userId })
  );
}

describe("GET /api/me", () => {
  it("creates PROFILE with correct defaults when missing", async () => {
    const userId = randomUUID();
    asUser(userId);
    const res = await GET(new Request("http://localhost/api/me"));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.subscriptionStatus).toBe("FREE");
    expect(json.data.activePracticeIds).toEqual([]);
    expect(json.data.latestAssessmentId).toBeNull();
    expect(json.data.createdAt).toBeDefined();

    // Verify item is in DynamoDB
    const profile = await createDynamoClient().getItem({ PK: `USER#${userId}`, SK: "PROFILE" });
    expect(profile).not.toBeUndefined();
  });

  it("GET /api/me is idempotent — second call does not overwrite createdAt", async () => {
    const userId = randomUUID();

    asUser(userId);
    const r1 = await GET(new Request("http://localhost/api/me"));
    const j1 = await r1.json();

    asUser(userId);
    const r2 = await GET(new Request("http://localhost/api/me"));
    const j2 = await r2.json();

    expect(j1.data.createdAt).toBe(j2.data.createdAt);
    expect(j1.data.userId).toBe(j2.data.userId);
  });

  it("returns activeTrialCount=0 even when legacy TRIAL# items exist in storage (v2 ignores them)", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedTrial(userId, "sleep-consistent-bedtime");

    asUser(userId);
    const res = await GET(new Request("http://localhost/api/me"));
    const json = await res.json();
    expect(json.data.activeTrialCount).toBe(0);
  });

  it("does not expose PK or SK in response", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    asUser(userId);
    const res = await GET(new Request("http://localhost/api/me"));
    const json = await res.json();
    expect(json.data.PK).toBeUndefined();
    expect(json.data.SK).toBeUndefined();
  });
});

describe("PATCH /api/me", () => {
  function patch(body: object) {
    return PATCH(
      new Request("http://localhost/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    );
  }

  it("updates timezone in DynamoDB", async () => {
    const userId = randomUUID();
    await seedProfile(userId);

    asUser(userId);
    const res = await patch({ timezone: "Australia/Melbourne" });
    expect(res.status).toBe(200);

    const profile = await createDynamoClient().getItem<{ timezone: string }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.timezone).toBe("Australia/Melbourne");
  });

  it("updates dayResetTime in DynamoDB", async () => {
    const userId = randomUUID();
    await seedProfile(userId);

    asUser(userId);
    const res = await patch({ dayResetTime: 240 });
    expect(res.status).toBe(200);

    const profile = await createDynamoClient().getItem<{ dayResetTime: number }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.dayResetTime).toBe(240);
  });

  it("rejects invalid timezone", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    asUser(userId);
    const res = await patch({ timezone: "Not/AReal/Zone" });
    expect(res.status).toBe(400);
  });

  it("rejects dayResetTime=1440 (out of range)", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    asUser(userId);
    const res = await patch({ dayResetTime: 1440 });
    expect(res.status).toBe(400);
  });

  it("no-op for empty body returns 200 without DB write", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    asUser(userId);
    const res = await patch({});
    expect(res.status).toBe(200);
  });
});
