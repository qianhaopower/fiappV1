import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/assessment/latest/route";

const getItemMock = vi.fn();

vi.mock("@/utils/dynamoClient", () => ({
  createDynamoClient: () => ({
    getItem: getItemMock,
  }),
}));

const getCurrentUserMock = vi.fn();
vi.mock("aws-amplify/auth/server", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

vi.mock("@/utils/amplifyServerUtils", () => ({
  runWithAmplifyServerContext: ({ operation }: { operation: (ctx: unknown) => Promise<unknown> }) =>
    operation({}),
}));

describe("GET /api/assessment/latest", () => {
  beforeEach(() => {
    getItemMock.mockReset();
    getCurrentUserMock.mockReset();
  });

  it("returns assessment when it exists", async () => {
    getCurrentUserMock.mockResolvedValue({ userId: "u1", username: "user" });
    getItemMock.mockImplementation(({ SK }: { SK: string }) => {
      if (SK === "PROFILE") {
        return { latestAssessmentId: "a1" };
      }
      return {
        assessmentId: "a1",
        createdAt: "2024-01-01T00:00:00.000Z",
        scoresByPillar: { financial: 1 },
        focusPillar: "financial",
      };
    });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.assessmentId).toBe("a1");
  });

  it("returns 404 when no assessment exists", async () => {
    getCurrentUserMock.mockResolvedValue({ userId: "u1", username: "user" });
    getItemMock.mockResolvedValue({ latestAssessmentId: null });

    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns 401 when unauthorized", async () => {
    getCurrentUserMock.mockRejectedValue(new Error("Unauthorized"));

    const res = await GET();
    expect(res.status).toBe(401);
  });
});
