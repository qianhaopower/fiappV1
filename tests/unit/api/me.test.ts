import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/me/route";

const getMyProfileMock = vi.fn();
const createMyProfileMock = vi.fn();

vi.mock("@/utils/dataServerClient", () => ({
  getDataClient: () => ({
    queries: { getMyProfile: getMyProfileMock },
    mutations: { createMyProfile: createMyProfileMock },
  }),
}));

const runWithAmplifyMock = vi.fn();
vi.mock("@/utils/amplifyServerUtils", () => ({
  runWithAmplifyServerContext: (opts: {
    operation: (ctx: unknown) => Promise<{ user: { userId: string; username?: string } }>;
  }) => runWithAmplifyMock(opts),
}));

describe("GET /api/me", () => {
  beforeEach(() => {
    getMyProfileMock.mockReset();
    createMyProfileMock.mockReset();
    runWithAmplifyMock.mockResolvedValue({
      user: { userId: "usr-test", username: "test@example.com" },
    });
  });

  it("returns existing profile without calling createMyProfile", async () => {
    const existingProfile = {
      userId: "usr-1",
      subscriptionStatus: "FREE",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      activePracticeIds: [],
      latestAssessmentId: null,
    };

    getMyProfileMock.mockResolvedValue({ data: existingProfile, errors: undefined });

    const req = new Request("http://localhost/api/me");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, data: existingProfile });
    expect(getMyProfileMock).toHaveBeenCalledTimes(1);
    expect(createMyProfileMock).not.toHaveBeenCalled();
  });

  it("creates profile when missing, returns it", async () => {
    getMyProfileMock.mockResolvedValue({ data: null, errors: undefined });

    const newProfile = {
      userId: "usr-2",
      subscriptionStatus: "FREE",
      createdAt: "2024-01-02T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
      activePracticeIds: [],
      activePracticeSkById: {},
      todayFocusPracticeId: null,
      latestAssessmentId: null,
      focusPillar: null,
    };

    createMyProfileMock.mockResolvedValue({ data: newProfile, errors: undefined });

    const req = new Request("http://localhost/api/me");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, data: newProfile });
    expect(json.data.subscriptionStatus).toBe("FREE");
    expect(getMyProfileMock).toHaveBeenCalledTimes(1);
    expect(createMyProfileMock).toHaveBeenCalledTimes(1);
  });

  it("returns same profile on second call (idempotent, no overwrite)", async () => {
    const profile = {
      userId: "usr-3",
      subscriptionStatus: "FREE",
      createdAt: "2024-01-03T00:00:00Z",
      updatedAt: "2024-01-03T00:00:00Z",
      activePracticeIds: [],
      latestAssessmentId: null,
    };

    getMyProfileMock.mockResolvedValue({ data: profile, errors: undefined });

    const req = new Request("http://localhost/api/me");
    const res1 = await GET(req);
    const json1 = await res1.json();
    const res2 = await GET(req);
    const json2 = await res2.json();

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(json1.data).toEqual(json2.data);
    expect(json1.data.userId).toBe("usr-3");
    expect(json1.data.subscriptionStatus).toBe("FREE");
    expect(createMyProfileMock).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    runWithAmplifyMock.mockRejectedValue(new Error("Not authenticated"));

    const req = new Request("http://localhost/api/me");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.ok).toBe(false);
    expect(json.error?.code).toBe("UNAUTHORIZED");
  });
});
