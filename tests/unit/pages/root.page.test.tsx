import { describe, it, expect, vi, beforeEach } from "vitest";
import Home from "@/app/page";

const redirectMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    redirectMock(url);
    throw new Error("NEXT_REDIRECT");
  },
}));

describe("Root page (/)", () => {
  beforeEach(() => {
    redirectMock.mockClear();
  });

  it("redirects to /decideRoute when user visits root URL (unauthenticated users are sent to /auth via decideRoute)", () => {
    expect(() => Home()).toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/decideRoute");
  });
});
