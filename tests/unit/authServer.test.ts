import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getUserId,
  UnauthorizedError,
  unauthorizedResponse,
  isUnauthorizedError,
} from "@/utils/authServer";

const runWithAmplifyMock = vi.fn();

vi.mock("@/utils/amplifyServerUtils", () => ({
  runWithAmplifyServerContext: (opts: {
    operation: (ctx: unknown) => Promise<{ user: { userId: string; username?: string } }>;
  }) => runWithAmplifyMock(opts),
}));

describe("authServer", () => {
  beforeEach(() => {
    runWithAmplifyMock.mockReset();
  });

  describe("getUserId", () => {
    it("returns userId and username when auth is valid", async () => {
      runWithAmplifyMock.mockResolvedValue({
        user: { userId: "usr-123", username: "user@example.com" },
      });

      const user = await getUserId();

      expect(user).toEqual({ userId: "usr-123", username: "user@example.com" });
    });

    it("throws UnauthorizedError when auth is missing or invalid", async () => {
      runWithAmplifyMock.mockRejectedValue(new Error("Not authenticated"));

      await expect(getUserId()).rejects.toThrow(UnauthorizedError);
      await expect(getUserId()).rejects.toThrow("Unauthorized");
    });

    it("accepts optional req parameter", async () => {
      runWithAmplifyMock.mockResolvedValue({
        user: { userId: "usr-456", username: null },
      });

      const req = new Request("http://localhost/api/me");
      const user = await getUserId(req);

      expect(user.userId).toBe("usr-456");
    });
  });

  describe("unauthorizedResponse", () => {
    it("returns 401 with standardized JSON body", async () => {
      const res = unauthorizedResponse();

      expect(res.status).toBe(401);

      const json = (await res.json()) as { ok: boolean; error: { code: string; message: string } };
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("UNAUTHORIZED");
      expect(json.error.message).toBe("Authentication required");
    });

    it("sets Cache-Control no-store", () => {
      const res = unauthorizedResponse();

      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });
  });

  describe("isUnauthorizedError", () => {
    it("returns true for UnauthorizedError instances", () => {
      expect(isUnauthorizedError(new UnauthorizedError())).toBe(true);
    });

    it("returns false for other errors", () => {
      expect(isUnauthorizedError(new Error("Other"))).toBe(false);
    });

    it("returns false for non-error values", () => {
      expect(isUnauthorizedError(null)).toBe(false);
      expect(isUnauthorizedError("unauthorized")).toBe(false);
    });
  });
});
