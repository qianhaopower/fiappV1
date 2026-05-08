import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { randomUUID } from "crypto";
import { POST } from "@/app/api/practice/route";
import { createDynamoClient } from "@/utils/dynamoClient";
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
    new Request("http://localhost/api/practice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

// ── mode = add ───────────────────────────────────────────────────────────────

describe("mode=add", () => {
  it("adds a practice for FREE user and writes UPRACTICE# item + updates PROFILE", async () => {
    const userId = randomUUID();
    await seedProfile(userId);

    asUser(userId);
    const res = await post({ mode: "add", practiceId: "financial-weekly-review" });
    expect(res.status).toBe(201);

    const client = createDynamoClient();
    const profile = await client.getItem<{ activePracticeIds: string[] }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.activePracticeIds).toContain("financial-weekly-review");

    const upractice = await client.getItem<{ status: string }>({
      PK: `USER#${userId}`, SK: "UPRACTICE#financial-weekly-review",
    });
    expect(upractice?.status).toBe("active");
  });

  it("FREE user is blocked at cap=1", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedActivePractice(userId, "financial-weekly-review");

    asUser(userId);
    const res = await post({ mode: "add", practiceId: "financial-24hr-rule" });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("CAP_REACHED");

    // PROFILE must not have changed
    const profile = await createDynamoClient().getItem<{ activePracticeIds: string[] }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.activePracticeIds).toHaveLength(1);
  });

  it("PAID user adds up to 10 practices", async () => {
    const userId = randomUUID();
    const practiceIds = [
      "financial-weekly-review", "financial-24hr-rule", "financial-save-small",
      "relationship-daily-checkin", "relationship-device-free-meal", "relationship-express-gratitude",
      "information-news-free-morning", "information-single-tab", "information-evening-review",
      "emotional-name-feeling",
    ];
    await seedProfile(userId, { subscriptionStatus: "PAID" });

    for (let i = 0; i < practiceIds.length; i++) {
      asUser(userId);
      const res = await post({ mode: "add", practiceId: practiceIds[i] });
      // warning is allowed at 5 and 7, but should still succeed
      expect(res.status).toBe(201);
    }

    const profile = await createDynamoClient().getItem<{ activePracticeIds: string[] }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.activePracticeIds).toHaveLength(10);
  });

  it("PAID user blocked at cap=10", async () => {
    const userId = randomUUID();
    const practiceIds = [
      "financial-weekly-review", "financial-24hr-rule", "financial-save-small",
      "relationship-daily-checkin", "relationship-device-free-meal", "relationship-express-gratitude",
      "information-news-free-morning", "information-single-tab", "information-evening-review",
      "emotional-name-feeling",
    ];
    await seedProfile(userId, {
      subscriptionStatus: "PAID",
      activePracticeIds: practiceIds,
    });

    asUser(userId);
    const res = await post({ mode: "add", practiceId: "emotional-3-breath-reset" });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("CAP_REACHED");
  });

  it("returns warning in response at count=5 (PAID) but add succeeds", async () => {
    const userId = randomUUID();
    // Seed 5 active practices so capCheck fires with activeCount=5 (>= PAID_WARN_LOW=5)
    const existing = [
      "financial-weekly-review", "financial-24hr-rule", "financial-save-small",
      "relationship-daily-checkin", "relationship-device-free-meal",
    ];
    await seedProfile(userId, { subscriptionStatus: "PAID", activePracticeIds: existing });

    asUser(userId);
    const res = await post({ mode: "add", practiceId: "sleep-consistent-bedtime" });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.warning).toBe("APPROACHING_CAP");
  });

  it("rejects unknown practiceId with 404", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    asUser(userId);
    const res = await post({ mode: "add", practiceId: "does-not-exist" });
    expect(res.status).toBe(404);
  });

  it("rejects already-active practice with 409", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedActivePractice(userId, "financial-weekly-review");
    asUser(userId);
    const res = await post({ mode: "add", practiceId: "financial-weekly-review" });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("ALREADY_ACTIVE");
  });
});

// ── mode = startTrial ────────────────────────────────────────────────────────

describe("mode=startTrial", () => {
  it("creates TRIAL# item without touching activePracticeIds", async () => {
    const userId = randomUUID();
    await seedProfile(userId);

    asUser(userId);
    const res = await post({ mode: "startTrial", practiceId: "sleep-consistent-bedtime" });
    expect(res.status).toBe(201);

    const client = createDynamoClient();
    const profile = await client.getItem<{ activePracticeIds: string[] }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.activePracticeIds).toEqual([]);

    const trials = await client.query<{ status: string; practiceId: string }>({
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: { ":pk": `USER#${userId}`, ":prefix": "TRIAL#" },
    });
    expect(trials).toHaveLength(1);
    expect(trials[0].status).toBe("trial");
    expect(trials[0].practiceId).toBe("sleep-consistent-bedtime");
  });

  it("succeeds even when PAID user is at cap=10", async () => {
    const userId = randomUUID();
    const ten = [
      "financial-weekly-review", "financial-24hr-rule", "financial-save-small",
      "relationship-daily-checkin", "relationship-device-free-meal", "relationship-express-gratitude",
      "information-news-free-morning", "information-single-tab", "information-evening-review",
      "emotional-name-feeling",
    ];
    await seedProfile(userId, { subscriptionStatus: "PAID", activePracticeIds: ten });

    asUser(userId);
    const res = await post({ mode: "startTrial", practiceId: "sleep-consistent-bedtime" });
    expect(res.status).toBe(201);
  });

  it("rejects when practice is already active (ALREADY_ACTIVE)", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedActivePractice(userId, "sleep-consistent-bedtime");
    asUser(userId);
    const res = await post({ mode: "startTrial", practiceId: "sleep-consistent-bedtime" });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("ALREADY_ACTIVE");
  });

  it("rejects when already trialing (ALREADY_TRIALING)", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedTrial(userId, "sleep-consistent-bedtime");
    asUser(userId);
    const res = await post({ mode: "startTrial", practiceId: "sleep-consistent-bedtime" });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("ALREADY_TRIALING");
  });

  it("rejects second trial when at MAX_CONCURRENT_TRIALS (TRIAL_LIMIT_REACHED)", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedTrial(userId, "sleep-consistent-bedtime");
    asUser(userId);
    const res = await post({ mode: "startTrial", practiceId: "sleep-screen-off" });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("TRIAL_LIMIT_REACHED");
  });
});

// ── mode = promoteTrial ──────────────────────────────────────────────────────

describe("mode=promoteTrial", () => {
  it("adds practice to activePracticeIds and marks trial promoted", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedTrial(userId, "sleep-consistent-bedtime");

    asUser(userId);
    const res = await post({ mode: "promoteTrial", practiceId: "sleep-consistent-bedtime" });
    expect(res.status).toBe(200);

    const client = createDynamoClient();
    const profile = await client.getItem<{ activePracticeIds: string[] }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.activePracticeIds).toContain("sleep-consistent-bedtime");

    const trials = await client.query<{ status: string }>({
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: { ":pk": `USER#${userId}`, ":prefix": "TRIAL#" },
    });
    expect(trials[0].status).toBe("promoted");
  });

  it("is blocked when FREE user already has 1 active practice", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedActivePractice(userId, "financial-weekly-review");
    await seedTrial(userId, "sleep-consistent-bedtime");

    asUser(userId);
    const res = await post({ mode: "promoteTrial", practiceId: "sleep-consistent-bedtime" });
    expect(res.status).toBe(409);

    // trial must still be status=trial (no mutation)
    const client = createDynamoClient();
    const trials = await client.query<{ status: string }>({
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: { ":pk": `USER#${userId}`, ":prefix": "TRIAL#" },
    });
    expect(trials[0].status).toBe("trial");
  });
});

// ── mode = discardTrial ──────────────────────────────────────────────────────

describe("mode=discardTrial", () => {
  it("marks trial discarded without touching activePracticeIds", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedTrial(userId, "sleep-consistent-bedtime");

    asUser(userId);
    const res = await post({ mode: "discardTrial", practiceId: "sleep-consistent-bedtime" });
    expect(res.status).toBe(200);

    const client = createDynamoClient();
    const profile = await client.getItem<{ activePracticeIds: string[] }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.activePracticeIds).toEqual([]);

    const trials = await client.query<{ status: string }>({
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: { ":pk": `USER#${userId}`, ":prefix": "TRIAL#" },
    });
    expect(trials[0].status).toBe("discarded");
  });
});

// ── mode = pause ─────────────────────────────────────────────────────────────

describe("mode=pause", () => {
  it("removes from activePracticeIds and sets UPRACTICE status=paused", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedActivePractice(userId, "financial-weekly-review");

    asUser(userId);
    const res = await post({ mode: "pause", practiceId: "financial-weekly-review" });
    expect(res.status).toBe(200);

    const client = createDynamoClient();
    const profile = await client.getItem<{ activePracticeIds: string[] }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.activePracticeIds).not.toContain("financial-weekly-review");

    const up = await client.getItem<{ status: string }>({
      PK: `USER#${userId}`, SK: "UPRACTICE#financial-weekly-review",
    });
    expect(up?.status).toBe("paused");
  });
});

// ── mode = resume ─────────────────────────────────────────────────────────────

describe("mode=resume", () => {
  it("adds back to activePracticeIds and sets UPRACTICE status=active", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedActivePractice(userId, "financial-weekly-review");

    // Pause it first
    asUser(userId);
    await post({ mode: "pause", practiceId: "financial-weekly-review" });

    asUser(userId);
    const res = await post({ mode: "resume", practiceId: "financial-weekly-review" });
    expect(res.status).toBe(200);

    const client = createDynamoClient();
    const profile = await client.getItem<{ activePracticeIds: string[] }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.activePracticeIds).toContain("financial-weekly-review");

    const up = await client.getItem<{ status: string }>({
      PK: `USER#${userId}`, SK: "UPRACTICE#financial-weekly-review",
    });
    expect(up?.status).toBe("active");
  });

  it("blocked at cap during resume", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    // Seed as paused (status in UPRACTICE but not in activePracticeIds)
    const client = createDynamoClient();
    await client.putItem({
      PK: `USER#${userId}`, SK: "UPRACTICE#financial-weekly-review",
      practiceId: "financial-weekly-review", pillar: "financial",
      addedAt: new Date().toISOString(), status: "paused",
    });
    // Already has 1 active (FREE cap)
    await seedActivePractice(userId, "financial-24hr-rule");

    asUser(userId);
    const res = await post({ mode: "resume", practiceId: "financial-weekly-review" });
    expect(res.status).toBe(409);

    const profile = await client.getItem<{ activePracticeIds: string[] }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.activePracticeIds).not.toContain("financial-weekly-review");
  });
});

// ── mode = replace ────────────────────────────────────────────────────────────

describe("mode=replace", () => {
  it("first call returns confirmToken, second call executes swap", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedActivePractice(userId, "financial-weekly-review");

    // First call — get confirm token
    asUser(userId);
    const r1 = await post({
      mode: "replace",
      practiceId: "financial-24hr-rule",
      replacePracticeId: "financial-weekly-review",
    });
    expect(r1.status).toBe(202);
    const { confirmToken } = await r1.json();
    expect(typeof confirmToken).toBe("string");

    // Second call — execute swap
    asUser(userId);
    const r2 = await post({
      mode: "replace",
      practiceId: "financial-24hr-rule",
      replacePracticeId: "financial-weekly-review",
      confirmToken,
    });
    expect(r2.status).toBe(200);

    const client = createDynamoClient();
    const profile = await client.getItem<{ activePracticeIds: string[] }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.activePracticeIds).toContain("financial-24hr-rule");
    expect(profile?.activePracticeIds).not.toContain("financial-weekly-review");

    const oldUp = await client.getItem<{ status: string }>({
      PK: `USER#${userId}`, SK: "UPRACTICE#financial-weekly-review",
    });
    expect(oldUp?.status).toBe("replaced");
  });
});

// ── mode = setFocus ───────────────────────────────────────────────────────────

describe("mode=setFocus", () => {
  it("sets todayFocusPracticeId on PROFILE for an active practice", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedActivePractice(userId, "financial-weekly-review");

    asUser(userId);
    const res = await post({ mode: "setFocus", practiceId: "financial-weekly-review" });
    expect(res.status).toBe(200);

    const profile = await createDynamoClient().getItem<{ todayFocusPracticeId: string }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.todayFocusPracticeId).toBe("financial-weekly-review");
  });

  it("accepts an active trial as focus practice", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedTrial(userId, "sleep-consistent-bedtime");

    asUser(userId);
    const res = await post({ mode: "setFocus", practiceId: "sleep-consistent-bedtime" });
    expect(res.status).toBe(200);
  });

  it("rejects a non-active, non-trial practice", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    asUser(userId);
    const res = await post({ mode: "setFocus", practiceId: "financial-weekly-review" });
    expect(res.status).toBe(409);
  });
});
