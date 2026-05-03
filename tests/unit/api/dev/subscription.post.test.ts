import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/dev/subscription/route";

const getMyProfileMock = vi.fn();
const setMySubscriptionStatusMock = vi.fn();

vi.mock("@/utils/dataServerClient", () => ({
  getDataClient: () => ({
    queries: { getMyProfile: getMyProfileMock },
    mutations: {
      setMySubscriptionStatus: setMySubscriptionStatusMock,
    },
  }),
}));

const runWithAmplifyMock = vi.fn();
vi.mock("@/utils/amplifyServerUtils", () => ({
  runWithAmplifyServerContext: (opts: {
    operation: (ctx: unknown) => Promise<{ user: { userId: string } }>;
  }) => runWithAmplifyMock(opts),
}));

describe("POST /api/dev/subscription", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    (process.env as Record<string, string>).NODE_ENV = "development";
    getMyProfileMock.mockResolvedValue({
      data: { subscriptionStatus: "FREE" },
      errors: undefined,
    });
    setMySubscriptionStatusMock.mockResolvedValue({ data: true, errors: undefined });
    runWithAmplifyMock.mockResolvedValue({
      user: { userId: "usr-1", username: "test@example.com" },
    });
  });

  afterEach(() => {
    (process.env as Record<string, string>).NODE_ENV = originalNodeEnv;
  });

  it("returns 404 in production", async () => {
    (process.env as Record<string, string>).NODE_ENV = "production";

    const req = new Request("http://localhost/api/dev/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionStatus: "PAID" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Not found");
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/dev/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid json",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when subscriptionStatus is not FREE or PAID", async () => {
    const req = new Request("http://localhost/api/dev/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionStatus: "INVALID" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("FREE or PAID");
  });

  it("updates subscription and returns 200 for valid FREE", async () => {
    getMyProfileMock
      .mockResolvedValueOnce({
        data: { subscriptionStatus: "PAID" },
        errors: undefined,
      })
      .mockResolvedValueOnce({
        data: { subscriptionStatus: "FREE" },
        errors: undefined,
      });

    const req = new Request("http://localhost/api/dev/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionStatus: "FREE" }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.requested).toBe("FREE");
    expect(setMySubscriptionStatusMock).toHaveBeenCalledWith({
      subscriptionStatus: "FREE",
    });
  });

  it("updates subscription and returns 200 for valid PAID", async () => {
    getMyProfileMock
      .mockResolvedValueOnce({
        data: { subscriptionStatus: "FREE" },
        errors: undefined,
      })
      .mockResolvedValueOnce({
        data: { subscriptionStatus: "PAID" },
        errors: undefined,
      });

    const req = new Request("http://localhost/api/dev/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionStatus: "PAID" }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.requested).toBe("PAID");
    expect(setMySubscriptionStatusMock).toHaveBeenCalledWith({
      subscriptionStatus: "PAID",
    });
  });

  it("returns 401 when unauthenticated", async () => {
    runWithAmplifyMock.mockRejectedValue(new Error("Not authenticated"));

    const req = new Request("http://localhost/api/dev/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionStatus: "PAID" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
