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

const dynamoQueryMock = vi.fn();
vi.mock("@/utils/dynamoClient", () => ({
  createDynamoClient: () => ({ query: dynamoQueryMock }),
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
    dynamoQueryMock.mockReset();
    dynamoQueryMock.mockResolvedValue([]); // no active trials by default
    runWithAmplifyMock.mockResolvedValue({
      user: { userId: "usr-test", username: "test@example.com" },
    });
  });

  it("returns existing profile with activeTrialCount=0 when no trials", async () => {
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
    expect(json.ok).toBe(true);
    expect(json.data.userId).toBe("usr-1");
    expect(json.data.activeTrialCount).toBe(0);
    expect(getMyProfileMock).toHaveBeenCalledTimes(1);
    expect(createMyProfileMock).not.toHaveBeenCalled();
  });

  it("returns activeTrialCount=1 when one active trial exists", async () => {
    const existingProfile = {
      userId: "usr-1",
      subscriptionStatus: "FREE",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      activePracticeIds: [],
      latestAssessmentId: "a1",
    };
    getMyProfileMock.mockResolvedValue({ data: existingProfile, errors: undefined });
    dynamoQueryMock.mockResolvedValue([{
      practiceId: "sleep-consistent-bedtime",
      status: "trial",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      SK: "TRIAL#x#sleep-consistent-bedtime",
    }]);

    const req = new Request("http://localhost/api/me");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.activeTrialCount).toBe(1);
  });

  it("does not count expired trials", async () => {
    const existingProfile = {
      userId: "usr-1",
      subscriptionStatus: "FREE",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      activePracticeIds: [],
      latestAssessmentId: "a1",
    };
    getMyProfileMock.mockResolvedValue({ data: existingProfile, errors: undefined });
    dynamoQueryMock.mockResolvedValue([{
      practiceId: "sleep-consistent-bedtime",
      status: "trial",
      expiresAt: new Date(Date.now() - 1000).toISOString(), // expired
      SK: "TRIAL#x#sleep-consistent-bedtime",
    }]);

    const req = new Request("http://localhost/api/me");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.activeTrialCount).toBe(0);
  });

  it("creates profile when missing, returns it with activeTrialCount", async () => {
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
    expect(json.ok).toBe(true);
    expect(json.data.subscriptionStatus).toBe("FREE");
    expect(json.data.activeTrialCount).toBe(0);
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
    expect(json1.data.userId).toBe(json2.data.userId);
    expect(json1.data.subscriptionStatus).toBe("FREE");
    expect(json1.data.activeTrialCount).toBe(0);
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
