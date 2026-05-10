import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { randomUUID } from "crypto";
import { GET } from "@/app/api/progress/route";
import { makeRawClient, makeTableNames, createTables, deleteTables } from "../tableUtils";
import { seedProfile, seedActivePractice, seedReturn, seedMilestone } from "../seeds";
import { dateRange, returnDayForUser } from "@/lib/returns/returns";
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

const PRACTICE = "financial-weekly-review";

describe("GET /api/progress", () => {
  it("returns zero-state safely with no profile", async () => {
    const userId = randomUUID();
    asUser(userId);
    const res = await GET(new Request("http://localhost/api/progress"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.totalReturns).toBe(0);
    expect(json.practicesActivated).toBe(0);
    expect(json.milestones).toEqual([]);
  });

  it("totalReturns reflects real returnCounters", async () => {
    const userId = randomUUID();
    await seedProfile(userId, { returnCounters: { [PRACTICE]: 5, "sleep-consistent-bedtime": 3 } });

    asUser(userId);
    const res = await GET(new Request("http://localhost/api/progress"));
    const json = await res.json();
    expect(json.totalReturns).toBe(8);
  });

  it("practicesActivated reflects number of UPRACTICE# items", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedActivePractice(userId, PRACTICE);
    await seedActivePractice(userId, "sleep-consistent-bedtime");

    asUser(userId);
    const res = await GET(new Request("http://localhost/api/progress"));
    const json = await res.json();
    expect(json.practicesActivated).toBe(2);
  });

  it("achieved milestones returned in response", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    await seedMilestone(userId, "total", 1);
    await seedMilestone(userId, "total", 7);

    asUser(userId);
    const res = await GET(new Request("http://localhost/api/progress"));
    const json = await res.json();
    expect(json.milestones).toHaveLength(2);
    const thresholds = json.milestones.map((m: { threshold: number }) => m.threshold);
    expect(thresholds).toContain(1);
    expect(thresholds).toContain(7);
  });

  it("nextMilestones skips already-achieved milestones", async () => {
    const userId = randomUUID();
    await seedProfile(userId, { returnCounters: { [PRACTICE]: 1 } });
    await seedMilestone(userId, "total", 1); // already achieved

    asUser(userId);
    const res = await GET(new Request("http://localhost/api/progress"));
    const json = await res.json();
    const nextTotal = json.nextMilestones.find(
      (m: { type: string }) => m.type === "total"
    );
    // Should show next total milestone (7), not 1
    expect(nextTotal?.threshold).toBe(7);
  });

  it("streaks computed from real FIAPP_RETURNS data", async () => {
    const userId = randomUUID();
    await seedProfile(userId, {
      activePracticeIds: [PRACTICE],
      returnCounters: {},
      timezone: "UTC",
      dayResetTime: 0,
    });
    await seedActivePractice(userId, PRACTICE);

    const today = returnDayForUser({
      timezone: "UTC",
      resetMinutes: 0,
    });
    const dates = dateRange(3, today);
    for (const d of dates) {
      await seedReturn(userId, PRACTICE, d, true);
    }

    asUser(userId);
    const res = await GET(new Request("http://localhost/api/progress"));
    const json = await res.json();
    expect(json.currentStreak).toBeGreaterThanOrEqual(1);
    expect(json.longestStreak).toBeGreaterThanOrEqual(3);
  });

  it("currentStreak is 0 when no active practices", async () => {
    const userId = randomUUID();
    await seedProfile(userId); // no active practices

    asUser(userId);
    const res = await GET(new Request("http://localhost/api/progress"));
    const json = await res.json();
    expect(json.currentStreak).toBe(0);
  });
});
