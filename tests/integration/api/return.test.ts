import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { randomUUID } from "crypto";
import { POST } from "@/app/api/return/route";
import { createDynamoClient, createReturnsClient } from "@/utils/dynamoClient";
import { makeReturnPK, makeReturnSK } from "@/lib/returns/returns";
import { makeMilestoneSK } from "@/lib/milestones/milestones";
import { makeRawClient, makeTableNames, createTables, deleteTables } from "../tableUtils";
import { seedProfile, seedActivePractice, seedTrial } from "../seeds";
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

function post(body: object) {
  return POST(
    new Request("http://localhost/api/return", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

const PRACTICE = "financial-weekly-review";
const TODAY = "2026-05-08";

describe("POST /api/return", () => {
  it("creates return item with correct PK and SK", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedActivePractice(userId, PRACTICE);

    asUser(userId);
    const res = await post({ practiceId: PRACTICE, didIt: true, date: TODAY });
    expect(res.status).toBe(200);

    const item = await createReturnsClient().getItem<{ didIt: boolean }>({
      PK: makeReturnPK(userId, PRACTICE),
      SK: makeReturnSK(TODAY),
    });
    expect(item?.didIt).toBe(true);
  });

  it("increments returnCounter on first true", async () => {
    const userId = randomUUID();
    await seedProfile(userId, { returnCounters: {} });
    await seedActivePractice(userId, PRACTICE);

    asUser(userId);
    await post({ practiceId: PRACTICE, didIt: true, date: TODAY });

    const profile = await createDynamoClient().getItem<{ returnCounters: Record<string, number> }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.returnCounters?.[PRACTICE]).toBe(1);
  });

  it("toggle true→false decrements counter", async () => {
    const userId = randomUUID();
    await seedProfile(userId, { returnCounters: { [PRACTICE]: 1 } });
    await seedActivePractice(userId, PRACTICE);

    // Seed existing return as true
    await createReturnsClient().putItem({
      PK: makeReturnPK(userId, PRACTICE), SK: makeReturnSK(TODAY),
      didIt: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    asUser(userId);
    const res = await post({ practiceId: PRACTICE, didIt: false, date: TODAY });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.delta).toBe(-1);

    const profile = await createDynamoClient().getItem<{ returnCounters: Record<string, number> }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.returnCounters?.[PRACTICE]).toBe(0);
  });

  it("toggle false→true increments counter", async () => {
    const userId = randomUUID();
    await seedProfile(userId, { returnCounters: { [PRACTICE]: 0 } });
    await seedActivePractice(userId, PRACTICE);

    await createReturnsClient().putItem({
      PK: makeReturnPK(userId, PRACTICE), SK: makeReturnSK(TODAY),
      didIt: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    asUser(userId);
    const res = await post({ practiceId: PRACTICE, didIt: true, date: TODAY });
    const json = await res.json();
    expect(json.delta).toBe(1);

    const profile = await createDynamoClient().getItem<{ returnCounters: Record<string, number> }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.returnCounters?.[PRACTICE]).toBe(1);
  });

  it("same value twice → noop, no duplicate items", async () => {
    const userId = randomUUID();
    await seedProfile(userId, { returnCounters: { [PRACTICE]: 1 } });
    await seedActivePractice(userId, PRACTICE);

    await createReturnsClient().putItem({
      PK: makeReturnPK(userId, PRACTICE), SK: makeReturnSK(TODAY),
      didIt: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    asUser(userId);
    const res = await post({ practiceId: PRACTICE, didIt: true, date: TODAY });
    const json = await res.json();
    expect(json.noop).toBe(true);

    // Counter unchanged
    const profile = await createDynamoClient().getItem<{ returnCounters: Record<string, number> }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.returnCounters?.[PRACTICE]).toBe(1);
  });

  it("upserts on same date — no duplicate items", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedActivePractice(userId, PRACTICE);

    asUser(userId);
    await post({ practiceId: PRACTICE, didIt: true, date: TODAY });
    asUser(userId);
    await post({ practiceId: PRACTICE, didIt: false, date: TODAY });

    // Only one item should exist
    const items = await createReturnsClient().query<{ didIt: boolean }>({
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": makeReturnPK(userId, PRACTICE) },
    });
    expect(items).toHaveLength(1);
    expect(items[0].didIt).toBe(false);
  });

  it("trial practice returns update counters (trials count toward milestones)", async () => {
    const userId = randomUUID();
    await seedProfile(userId, { returnCounters: {} });
    await seedTrial(userId, PRACTICE);

    asUser(userId);
    const res = await post({ practiceId: PRACTICE, didIt: true, date: TODAY });
    expect(res.status).toBe(200);

    const profile = await createDynamoClient().getItem<{ returnCounters: Record<string, number> }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.returnCounters?.[PRACTICE]).toBe(1);
  });

  it("milestone triggered at threshold=1 and written to DynamoDB", async () => {
    const userId = randomUUID();
    await seedProfile(userId, { returnCounters: {} });
    await seedActivePractice(userId, PRACTICE);

    asUser(userId);
    const res = await post({ practiceId: PRACTICE, didIt: true, date: TODAY });
    const json = await res.json();
    expect(json.newMilestones.some((m: { threshold: number }) => m.threshold === 1)).toBe(true);

    const milestone = await createDynamoClient().getItem({
      PK: `USER#${userId}`,
      SK: makeMilestoneSK("total", 1),
    });
    expect(milestone).not.toBeUndefined();
  });

  it("milestone not written twice (idempotency via putItemIfNotExists)", async () => {
    const userId = randomUUID();
    // Manually seed MILESTONE#total#1 as already achieved
    await seedProfile(userId, { returnCounters: { [PRACTICE]: 1 } });
    await seedActivePractice(userId, PRACTICE);
    await createDynamoClient().putItem({
      PK: `USER#${userId}`, SK: makeMilestoneSK("total", 1),
      type: "total", threshold: 1, title: "First", description: "First", achievedAt: new Date().toISOString(),
    });

    await createReturnsClient().putItem({
      PK: makeReturnPK(userId, PRACTICE), SK: makeReturnSK(TODAY),
      didIt: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    asUser(userId);
    const res = await post({ practiceId: PRACTICE, didIt: false, date: "2026-05-09" });
    const json = await res.json();
    // Going from 1 to 0 (delta=-1), no new milestones
    expect(json.newMilestones).toHaveLength(0);

    // Now add again — total goes to 1 again but milestone already exists
    asUser(userId);
    const res2 = await post({ practiceId: PRACTICE, didIt: true, date: "2026-05-09" });
    const json2 = await res2.json();
    expect(json2.newMilestones).toHaveLength(0); // putItemIfNotExists returns false → filtered out
  });

  it("rejects return for non-active, non-trial practice", async () => {
    const userId = randomUUID();
    await seedProfile(userId);

    asUser(userId);
    const res = await post({ practiceId: PRACTICE, didIt: true, date: TODAY });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("PRACTICE_NOT_ACTIVE_OR_TRIAL");
  });
});
