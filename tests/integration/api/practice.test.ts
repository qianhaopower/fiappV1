import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { randomUUID } from "crypto";
import { POST } from "@/app/api/practice/route";
import { createDynamoClient } from "@/utils/dynamoClient";
import { makeRawClient, makeTableNames, createTables, deleteTables } from "../tableUtils";
import { seedProfile, seedActivePractice } from "../seeds";
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

// ── startPractice ────────────────────────────────────────────────────────────

describe("mode=startPractice", () => {
  it("creates UPRACTICE# item with v2 fields and updates PROFILE.activePracticeIds", async () => {
    const userId = randomUUID();
    await seedProfile(userId);

    asUser(userId);
    const res = await post({ mode: "startPractice", practiceId: "financial-label-decision" });
    expect(res.status).toBe(201);

    const client = createDynamoClient();
    const profile = await client.getItem<{ activePracticeIds: string[] }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.activePracticeIds).toContain("financial-label-decision");

    const upractice = await client.getItem<{
      status: string;
      firstStartedAt: string;
      lastActivatedAt: string;
    }>({
      PK: `USER#${userId}`, SK: "UPRACTICE#financial-label-decision",
    });
    expect(upractice?.status).toBe("active");
    expect(upractice?.firstStartedAt).toBeDefined();
    expect(upractice?.lastActivatedAt).toBeDefined();
  });

  it("FREE user is blocked at cap=1 with CAP_REACHED", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedActivePractice(userId, "financial-label-decision");

    asUser(userId);
    const res = await post({ mode: "startPractice", practiceId: "financial-auto-payment-review" });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("CAP_REACHED");

    const profile = await createDynamoClient().getItem<{ activePracticeIds: string[] }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.activePracticeIds).toHaveLength(1);
  });

  // Regression: PROFILE.activePracticeIds and UPRACTICE.status are two writes that can
  // diverge if a Promise.all step fails. The cap check must trust UPRACTICE (the source
  // of truth used by /api/practices/active), not the cached PROFILE array.
  it("recovers when PROFILE.activePracticeIds is stale but no UPRACTICE is active", async () => {
    const userId = randomUUID();
    // PROFILE wrongly says the cap is full, but there's no active UPRACTICE.
    await seedProfile(userId, {
      activePracticeIds: ["financial-label-decision"],
      subscriptionStatus: "FREE",
    });

    asUser(userId);
    const res = await post({ mode: "startPractice", practiceId: "sleep-consistent-bedtime" });
    expect(res.status).toBe(201);

    const client = createDynamoClient();
    const profile = await client.getItem<{ activePracticeIds: string[] }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    // PROFILE is reconciled from UPRACTICE truth on the write.
    expect(profile?.activePracticeIds).toEqual(["sleep-consistent-bedtime"]);
  });

  it("PAID user can add up to 10 practices with no warnings", async () => {
    const userId = randomUUID();
    const practiceIds = [
      "financial-label-decision", "financial-auto-payment-review", "financial-purchase-pause",
      "relationship-caring-action", "relationship-caring-question", "relationship-notice-detail",
      "information-phone-away-think", "information-learn-in-chunks", "information-check-source",
      "emotional-name-before-reacting",
    ];
    await seedProfile(userId, { subscriptionStatus: "PAID" });

    for (const pid of practiceIds) {
      asUser(userId);
      const res = await post({ mode: "startPractice", practiceId: pid });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.warning).toBeUndefined();
    }

    const profile = await createDynamoClient().getItem<{ activePracticeIds: string[] }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.activePracticeIds).toHaveLength(10);
  });

  it("PAID user blocked at 10 with CAP_REACHED", async () => {
    const userId = randomUUID();
    const practiceIds = [
      "financial-label-decision", "financial-auto-payment-review", "financial-purchase-pause",
      "relationship-caring-action", "relationship-caring-question", "relationship-notice-detail",
      "information-phone-away-think", "information-learn-in-chunks", "information-check-source",
      "emotional-name-before-reacting",
    ];
    await seedProfile(userId, { subscriptionStatus: "PAID" });
    for (const pid of practiceIds) await seedActivePractice(userId, pid);

    asUser(userId);
    const res = await post({ mode: "startPractice", practiceId: "emotional-now-or-echo" });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("CAP_REACHED");
  });

  it("returns 200 alreadyActive when practice is already active (idempotent)", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedActivePractice(userId, "financial-label-decision");

    asUser(userId);
    const res = await post({ mode: "startPractice", practiceId: "financial-label-decision" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.alreadyActive).toBe(true);
  });

  it("reactivates an inactive UPRACTICE — preserves firstStartedAt, sets lastActivatedAt", async () => {
    const userId = randomUUID();
    await seedProfile(userId);

    // Start, then make inactive
    asUser(userId);
    await post({ mode: "startPractice", practiceId: "financial-label-decision" });

    const client = createDynamoClient();
    const before = await client.getItem<{ firstStartedAt: string; lastActivatedAt: string }>({
      PK: `USER#${userId}`, SK: "UPRACTICE#financial-label-decision",
    });
    const originalFirst = before?.firstStartedAt;

    asUser(userId);
    await post({ mode: "makePracticeInactive", practiceId: "financial-label-decision" });

    // Sleep 5ms to ensure timestamp difference
    await new Promise((r) => setTimeout(r, 10));

    asUser(userId);
    const res = await post({ mode: "startPractice", practiceId: "financial-label-decision" });
    expect(res.status).toBe(200);
    expect((await res.json()).reactivated).toBe(true);

    const after = await client.getItem<{
      status: string;
      firstStartedAt: string;
      lastActivatedAt: string;
    }>({
      PK: `USER#${userId}`, SK: "UPRACTICE#financial-label-decision",
    });
    expect(after?.status).toBe("active");
    expect(after?.firstStartedAt).toBe(originalFirst);
    expect(new Date(after!.lastActivatedAt).getTime()).toBeGreaterThan(
      new Date(originalFirst!).getTime(),
    );
  });

  it("reactivates a legacy 'paused' UPRACTICE (lenient read of legacy status)", async () => {
    const userId = randomUUID();
    await seedProfile(userId);

    const client = createDynamoClient();
    // Seed a legacy paused UPRACTICE directly (simulates pre-v2 data)
    await client.putItem({
      PK: `USER#${userId}`,
      SK: "UPRACTICE#sleep-consistent-bedtime",
      practiceId: "sleep-consistent-bedtime",
      pillar: "sleep",
      status: "paused",
      addedAt: new Date().toISOString(),
    });

    asUser(userId);
    const res = await post({ mode: "startPractice", practiceId: "sleep-consistent-bedtime" });
    expect(res.status).toBe(200);
    expect((await res.json()).reactivated).toBe(true);

    const after = await client.getItem<{ status: string }>({
      PK: `USER#${userId}`, SK: "UPRACTICE#sleep-consistent-bedtime",
    });
    expect(after?.status).toBe("active");
  });

  it("returns 404 for unknown practiceId", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    asUser(userId);
    const res = await post({ mode: "startPractice", practiceId: "does-not-exist" });
    expect(res.status).toBe(404);
  });
});

// ── reactivatePractice (alias for startPractice) ─────────────────────────────

describe("mode=reactivatePractice (alias for startPractice)", () => {
  it("reactivates an inactive UPRACTICE", async () => {
    const userId = randomUUID();
    await seedProfile(userId);

    asUser(userId);
    await post({ mode: "startPractice", practiceId: "financial-label-decision" });
    asUser(userId);
    await post({ mode: "makePracticeInactive", practiceId: "financial-label-decision" });

    asUser(userId);
    const res = await post({ mode: "reactivatePractice", practiceId: "financial-label-decision" });
    expect(res.status).toBe(200);
    expect((await res.json()).reactivated).toBe(true);

    const after = await createDynamoClient().getItem<{ status: string }>({
      PK: `USER#${userId}`, SK: "UPRACTICE#financial-label-decision",
    });
    expect(after?.status).toBe("active");
  });
});

// ── makePracticeInactive ─────────────────────────────────────────────────────

describe("mode=makePracticeInactive", () => {
  it("flips active to inactive — removes from activePracticeIds, sets lastInactivatedAt", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedActivePractice(userId, "financial-label-decision");

    asUser(userId);
    const res = await post({ mode: "makePracticeInactive", practiceId: "financial-label-decision" });
    expect(res.status).toBe(200);

    const client = createDynamoClient();
    const profile = await client.getItem<{ activePracticeIds: string[] }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.activePracticeIds).not.toContain("financial-label-decision");

    const upractice = await client.getItem<{ status: string; lastInactivatedAt: string }>({
      PK: `USER#${userId}`, SK: "UPRACTICE#financial-label-decision",
    });
    expect(upractice?.status).toBe("inactive");
    expect(upractice?.lastInactivatedAt).toBeDefined();
  });

  it("returns 409 PRACTICE_NOT_ACTIVE when no UPRACTICE exists", async () => {
    const userId = randomUUID();
    await seedProfile(userId);

    asUser(userId);
    const res = await post({ mode: "makePracticeInactive", practiceId: "financial-label-decision" });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("PRACTICE_NOT_ACTIVE");
  });

  it("returns 409 when practice is already inactive", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedActivePractice(userId, "financial-label-decision");

    asUser(userId);
    await post({ mode: "makePracticeInactive", practiceId: "financial-label-decision" });
    asUser(userId);
    const res = await post({ mode: "makePracticeInactive", practiceId: "financial-label-decision" });
    expect(res.status).toBe(409);
  });
});

// ── switchToPractice ─────────────────────────────────────────────────────────

describe("mode=switchToPractice (free-user 1-cap flow)", () => {
  it("deactivates the old practice and activates the new", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedActivePractice(userId, "financial-label-decision");

    asUser(userId);
    const res = await post({
      mode: "switchToPractice",
      practiceId: "sleep-consistent-bedtime",
      deactivatePracticeId: "financial-label-decision",
    });
    expect(res.status).toBe(200);

    const client = createDynamoClient();
    const profile = await client.getItem<{ activePracticeIds: string[] }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.activePracticeIds).toEqual(["sleep-consistent-bedtime"]);

    const oldUp = await client.getItem<{ status: string }>({
      PK: `USER#${userId}`, SK: "UPRACTICE#financial-label-decision",
    });
    expect(oldUp?.status).toBe("inactive");

    const newUp = await client.getItem<{ status: string }>({
      PK: `USER#${userId}`, SK: "UPRACTICE#sleep-consistent-bedtime",
    });
    expect(newUp?.status).toBe("active");
  });

  it("reactivates an existing inactive practice on the activate side", async () => {
    const userId = randomUUID();
    await seedProfile(userId);

    // Start and inactivate sleep practice
    asUser(userId);
    await post({ mode: "startPractice", practiceId: "sleep-consistent-bedtime" });
    asUser(userId);
    await post({ mode: "makePracticeInactive", practiceId: "sleep-consistent-bedtime" });

    const client = createDynamoClient();
    const firstStarted = (
      await client.getItem<{ firstStartedAt: string }>({
        PK: `USER#${userId}`, SK: "UPRACTICE#sleep-consistent-bedtime",
      })
    )?.firstStartedAt;

    // Now start a different practice and switch back to sleep
    asUser(userId);
    await post({ mode: "startPractice", practiceId: "financial-label-decision" });

    asUser(userId);
    const res = await post({
      mode: "switchToPractice",
      practiceId: "sleep-consistent-bedtime",
      deactivatePracticeId: "financial-label-decision",
    });
    expect(res.status).toBe(200);

    const after = await client.getItem<{ status: string; firstStartedAt: string }>({
      PK: `USER#${userId}`, SK: "UPRACTICE#sleep-consistent-bedtime",
    });
    expect(after?.status).toBe("active");
    expect(after?.firstStartedAt).toBe(firstStarted);
  });

  it("returns 400 when practiceId === deactivatePracticeId", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedActivePractice(userId, "financial-label-decision");

    asUser(userId);
    const res = await post({
      mode: "switchToPractice",
      practiceId: "financial-label-decision",
      deactivatePracticeId: "financial-label-decision",
    });
    expect(res.status).toBe(400);
  });

  it("returns 409 when the practice to deactivate is not active", async () => {
    const userId = randomUUID();
    await seedProfile(userId);

    asUser(userId);
    const res = await post({
      mode: "switchToPractice",
      practiceId: "sleep-consistent-bedtime",
      deactivatePracticeId: "financial-label-decision",
    });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("DEACTIVATE_PRACTICE_NOT_ACTIVE");
  });

  it("returns 409 when target is already active", async () => {
    const userId = randomUUID();
    await seedProfile(userId, { subscriptionStatus: "PAID" });
    await seedActivePractice(userId, "financial-label-decision");
    await seedActivePractice(userId, "sleep-consistent-bedtime");

    asUser(userId);
    const res = await post({
      mode: "switchToPractice",
      practiceId: "sleep-consistent-bedtime",
      deactivatePracticeId: "financial-label-decision",
    });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("PRACTICE_ALREADY_ACTIVE");
  });
});

// ── auth & validation ────────────────────────────────────────────────────────

describe("mode validation", () => {
  it("rejects removed v1 modes (startTrial / promoteTrial / pause / replace / setFocus) with 400", async () => {
    const userId = randomUUID();
    await seedProfile(userId);

    for (const mode of ["startTrial", "promoteTrial", "discardTrial", "add", "replace", "pause", "resume", "setFocus"]) {
      asUser(userId);
      const res = await post({ mode, practiceId: "financial-label-decision" });
      expect(res.status).toBe(400);
    }
  });
});
