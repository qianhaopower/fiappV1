import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { randomUUID } from "crypto";
import { POST } from "@/app/api/assessment/route";
import { GET as GET_LATEST } from "@/app/api/assessment/latest/route";
import { createDynamoClient } from "@/utils/dynamoClient";
import { assessmentQuestions } from "@/lib/assessment/questions";
import { makeRawClient, makeTableNames, createTables, deleteTables } from "../tableUtils";
import { seedProfile } from "../seeds";
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

function allAnswers(value: boolean): Record<string, boolean> {
  return Object.fromEntries(assessmentQuestions.map((q) => [q.id, value]));
}

function postAssessment(answers: Record<string, boolean>) {
  return POST(
    new Request("http://localhost/api/assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    })
  );
}

describe("POST /api/assessment", () => {
  it("persists ASSESS# item and updates PROFILE", async () => {
    const userId = randomUUID();
    await seedProfile(userId);

    asUser(userId);
    const res = await postAssessment(allAnswers(true));
    expect(res.status).toBe(200);
    const json = await res.json();
    const { assessmentId, focusPillar } = json;
    expect(assessmentId).toBeDefined();
    expect(focusPillar).toBeDefined();

    const client = createDynamoClient();

    // ASSESS# item written with v2 fields
    const assessment = await client.getItem<{
      focusPillar: string;
      lowestPillarId: string;
      totalScore: number;
      suggestedPracticeIds: string[];
    }>({
      PK: `USER#${userId}`,
      SK: `ASSESS#${assessmentId}`,
    });
    expect(assessment?.focusPillar).toBe(focusPillar);
    expect(assessment?.lowestPillarId).toBe(focusPillar);
    expect(assessment?.totalScore).toBe(35); // all true
    expect(assessment?.suggestedPracticeIds).toHaveLength(3);
    expect(assessment?.suggestedPracticeIds).toEqual(json.suggestedPracticeIds);

    // PROFILE updated with both legacy + v2 pillar fields
    const profile = await client.getItem<{
      latestAssessmentId: string;
      focusPillar: string;
      lowestPillarId: string;
    }>({
      PK: `USER#${userId}`, SK: "PROFILE",
    });
    expect(profile?.latestAssessmentId).toBe(assessmentId);
    expect(profile?.focusPillar).toBe(focusPillar);
    expect(profile?.lowestPillarId).toBe(focusPillar);
  });

  it("returns correct scoresByPillar — all NO gives 0 for every pillar", async () => {
    const userId = randomUUID();
    await seedProfile(userId);

    asUser(userId);
    const res = await postAssessment(allAnswers(false));
    const json = await res.json();
    for (const score of Object.values(json.scoresByPillar as Record<string, number>)) {
      expect(score).toBe(0);
    }
  });

  it("rejects when answer count is wrong", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    asUser(userId);
    const res = await POST(
      new Request("http://localhost/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: { "financial-1": true } }),
      })
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/assessment/latest", () => {
  it("returns 404 when no assessment exists", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    asUser(userId);
    const res = await GET_LATEST();
    expect(res.status).toBe(404);
  });

  it("returns assessment data when one exists", async () => {
    const userId = randomUUID();
    await seedProfile(userId);

    asUser(userId);
    await postAssessment(allAnswers(true));

    asUser(userId);
    const res = await GET_LATEST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.assessmentId).toBeDefined();
    expect(json.focusPillar).toBeDefined();
    expect(json.scoresByPillar).toBeDefined();
  });

  it("returns the most recent assessment after two submissions", async () => {
    const userId = randomUUID();
    await seedProfile(userId);

    asUser(userId);
    await postAssessment(allAnswers(false)); // first

    asUser(userId);
    const r2 = await postAssessment(allAnswers(true)); // second
    const { assessmentId: secondId } = await r2.json();

    asUser(userId);
    const res = await GET_LATEST();
    const json = await res.json();
    expect(json.assessmentId).toBe(secondId);
  });
});
