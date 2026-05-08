import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { randomUUID } from "crypto";
import { GET } from "@/app/api/practices/suggestions/route";
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

describe("GET /api/practices/suggestions", () => {
  it("returns 3 suggestions from focusPillar when set on PROFILE", async () => {
    const userId = randomUUID();
    await seedProfile(userId, { focusPillar: "sleep" });

    asUser(userId);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.suggestions).toHaveLength(3);
    expect(json.suggestions.every((s: { pillar: string }) => s.pillar === "sleep")).toBe(true);
    expect(json.focusPillar).toBe("sleep");
  });

  it("returns 3 fallback suggestions when focusPillar is null", async () => {
    const userId = randomUUID();
    await seedProfile(userId, { focusPillar: null });

    asUser(userId);
    const res = await GET();
    const json = await res.json();
    expect(json.suggestions).toHaveLength(3);
    expect(json.focusPillar).toBeNull();
  });

  it("returns 3 fallback suggestions when no PROFILE exists", async () => {
    const userId = randomUUID();
    asUser(userId);
    const res = await GET();
    const json = await res.json();
    expect(json.suggestions).toHaveLength(3);
  });

  it("each suggestion has required fields", async () => {
    const userId = randomUUID();
    await seedProfile(userId, { focusPillar: "financial" });
    asUser(userId);
    const res = await GET();
    const json = await res.json();
    for (const s of json.suggestions) {
      expect(s).toHaveProperty("id");
      expect(s).toHaveProperty("pillar");
      expect(s).toHaveProperty("title");
      expect(s).toHaveProperty("description");
      expect(s).toHaveProperty("rationale");
    }
  });
});
