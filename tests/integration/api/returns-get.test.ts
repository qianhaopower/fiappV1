import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { randomUUID } from "crypto";
import { GET } from "@/app/api/returns/route";
import { makeRawClient, makeTableNames, createTables, deleteTables } from "../tableUtils";
import { seedProfile, seedReturn } from "../seeds";
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

const PRACTICE = "financial-label-decision";

function get(practiceId: string, days?: number) {
  const url = new URL("http://localhost/api/returns");
  url.searchParams.set("practiceId", practiceId);
  if (days !== undefined) url.searchParams.set("days", String(days));
  return GET(new Request(url.toString()));
}

describe("GET /api/returns", () => {
  it("returns dot entries with correct didIt values for seeded returns", async () => {
    const userId = randomUUID();
    await seedProfile(userId, { timezone: "UTC", dayResetTime: 0 });
    await seedReturn(userId, PRACTICE, "2026-05-07", true);
    await seedReturn(userId, PRACTICE, "2026-05-08", false);

    asUser(userId);
    const res = await get(PRACTICE, 14);
    expect(res.status).toBe(200);
    const json = await res.json();

    const may7 = json.returns.find((r: { date: string }) => r.date === "2026-05-07");
    const may8 = json.returns.find((r: { date: string }) => r.date === "2026-05-08");
    expect(may7?.didIt).toBe(true);
    expect(may8?.didIt).toBe(false);
  });

  it("dates with no returns have didIt=null", async () => {
    const userId = randomUUID();
    await seedProfile(userId, { timezone: "UTC", dayResetTime: 0 });

    asUser(userId);
    const res = await get(PRACTICE, 7);
    const json = await res.json();
    expect(json.returns.every((r: { didIt: unknown }) => r.didIt === null)).toBe(true);
  });

  it("total reflects count of didIt=true items only", async () => {
    const userId = randomUUID();
    await seedProfile(userId, { timezone: "UTC", dayResetTime: 0 });
    await seedReturn(userId, PRACTICE, "2026-05-06", true);
    await seedReturn(userId, PRACTICE, "2026-05-07", true);
    await seedReturn(userId, PRACTICE, "2026-05-08", false);

    asUser(userId);
    const res = await get(PRACTICE, 14);
    const json = await res.json();
    expect(json.total).toBe(2);
  });

  it("respects days param — returns exactly N entries", async () => {
    const userId = randomUUID();
    await seedProfile(userId, { timezone: "UTC", dayResetTime: 0 });

    asUser(userId);
    const res = await get(PRACTICE, 7);
    const json = await res.json();
    expect(json.returns).toHaveLength(7);
    expect(json.days).toBe(7);
  });

  it("rejects missing practiceId", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    asUser(userId);
    const res = await GET(new Request("http://localhost/api/returns"));
    expect(res.status).toBe(400);
  });

  it("rejects unknown practiceId", async () => {
    const userId = randomUUID();
    await seedProfile(userId);
    asUser(userId);
    const res = await get("not-a-real-practice");
    expect(res.status).toBe(404);
  });
});
