import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { randomUUID } from "crypto";
import { GET } from "@/app/api/practices/suggestions/route";
import { makeRawClient, makeTableNames, createTables, deleteTables } from "../tableUtils";
import { seedProfile, seedAssessment } from "../seeds";
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

describe("GET /api/practices/suggestions", () => {
  it("hydrates suggestions from the latest ASSESS suggestedPracticeIds", async () => {
    const userId = randomUUID();
    const assessmentId = randomUUID();
    const ids = [
      "sleep-consistent-bedtime",
      "sleep-wind-down-ritual",
      "sleep-screen-off",
    ];

    await seedProfile(userId);
    await seedAssessment(userId, assessmentId, {
      focusPillar: "sleep",
      lowestPillarId: "sleep",
      suggestedPracticeIds: ids,
    });

    asUser(userId);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.suggestions.map((s: { id: string }) => s.id)).toEqual(ids);
    expect(json.lowestPillarId).toBe("sleep");
    expect(json.focusPillar).toBe("sleep");
  });

  it("falls back to pillar-based pick when ASSESS lacks suggestedPracticeIds (legacy)", async () => {
    const userId = randomUUID();
    const assessmentId = randomUUID();
    await seedProfile(userId);
    await seedAssessment(userId, assessmentId, {
      focusPillar: "sleep",
      lowestPillarId: "sleep",
      // no suggestedPracticeIds — simulates a legacy assessment
    });

    asUser(userId);
    const res = await GET();
    const json = await res.json();
    expect(json.suggestions).toHaveLength(3);
    expect(json.suggestions.every((s: { pillar: string }) => s.pillar === "sleep")).toBe(true);
  });

  it("returns fallback suggestions when no assessment exists", async () => {
    const userId = randomUUID();
    await seedProfile(userId);

    asUser(userId);
    const res = await GET();
    const json = await res.json();
    expect(json.suggestions).toHaveLength(3);
    expect(json.focusPillar).toBeNull();
  });

  it("returns fallback suggestions when no PROFILE exists", async () => {
    const userId = randomUUID();
    asUser(userId);
    const res = await GET();
    const json = await res.json();
    expect(json.suggestions).toHaveLength(3);
  });

  it("each suggestion has required fields", async () => {
    const userId = randomUUID();
    const assessmentId = randomUUID();
    await seedProfile(userId);
    await seedAssessment(userId, assessmentId, {
      focusPillar: "financial",
      lowestPillarId: "financial",
      suggestedPracticeIds: [
        "financial-weekly-review",
        "financial-bill-list",
        "financial-24hr-rule",
      ],
    });
    asUser(userId);
    const res = await GET();
    const json = await res.json();
    for (const s of json.suggestions) {
      expect(s).toHaveProperty("id");
      expect(s).toHaveProperty("pillar");
      expect(s).toHaveProperty("title");
      expect(s).toHaveProperty("description");
      expect(s).toHaveProperty("rationale");
      expect(s).toHaveProperty("mappedQuestionId");
    }
  });
});
