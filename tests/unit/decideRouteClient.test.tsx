import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import DecideRouteClient from "@/components/DecideRouteClient";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

type MockResponse = {
  status: number;
  json: () => Promise<unknown>;
};

function makeResponse(status: number, body: unknown): MockResponse {
  return {
    status,
    json: async () => body,
  };
}

describe("DecideRouteClient", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows loading while fetch is pending", () => {
    (global.fetch as unknown as Mock).mockImplementation(
      () => new Promise(() => {})
    );

    render(<DecideRouteClient />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to /assessment when no assessment", async () => {
    (global.fetch as unknown as Mock).mockResolvedValue(
      makeResponse(200, {
        profile: {
          latestAssessmentId: null,
          activePracticeIds: ["p1"],
          todayFocusPracticeId: "p1",
        },
      })
    );

    render(<DecideRouteClient />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/assessment");
    });
  });

  it("redirects to /results when no active practices", async () => {
    (global.fetch as unknown as Mock).mockResolvedValue(
      makeResponse(200, {
        profile: {
          latestAssessmentId: "a1",
          activePracticeIds: [],
          todayFocusPracticeId: "p1",
        },
      })
    );

    render(<DecideRouteClient />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/results");
    });
  });

  it("redirects to /practices when no focus practice", async () => {
    (global.fetch as unknown as Mock).mockResolvedValue(
      makeResponse(200, {
        profile: {
          latestAssessmentId: "a1",
          activePracticeIds: ["p1"],
          todayFocusPracticeId: null,
        },
      })
    );

    render(<DecideRouteClient />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/practices");
    });
  });

  it("redirects to /today when focus practice exists", async () => {
    (global.fetch as unknown as Mock).mockResolvedValue(
      makeResponse(200, {
        profile: {
          latestAssessmentId: "a1",
          activePracticeIds: ["p1"],
          todayFocusPracticeId: "p1",
        },
      })
    );

    render(<DecideRouteClient />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/today");
    });
  });

  it("redirects to /auth on 401 or 403", async () => {
    (global.fetch as unknown as Mock).mockResolvedValue(
      makeResponse(401, { error: "Unauthorized" })
    );

    render(<DecideRouteClient />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/auth");
    });
  });

  it("shows error state on 500 or network error", async () => {
    (global.fetch as unknown as Mock).mockResolvedValue(
      makeResponse(500, { error: "Server error" })
    );

    render(<DecideRouteClient />);

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    });

    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("shows error state on network failure", async () => {
    (global.fetch as unknown as Mock).mockRejectedValue(new Error("Network"));

    render(<DecideRouteClient />);

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    });

    expect(replaceMock).not.toHaveBeenCalled();
  });
});
