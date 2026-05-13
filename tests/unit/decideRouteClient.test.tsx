import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import DecideRouteClient from "@/components/DecideRouteClient";

const replaceMock = vi.fn();
const useProfileMock = vi.fn();
let mockAuthStatus = "authenticated";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("@aws-amplify/ui-react", () => ({
  useAuthenticator: () => ({ authStatus: mockAuthStatus }),
}));

vi.mock("@/contexts/ProfileContext", () => ({
  useProfile: () => useProfileMock(),
}));

describe("DecideRouteClient", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    useProfileMock.mockReset();
    mockAuthStatus = "authenticated";
  });

  it("shows loading while profile is pending", () => {
    useProfileMock.mockReturnValue({
      profile: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<DecideRouteClient />);

    expect(screen.getByText("Loading your profile…")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to /onboarding when no assessment", async () => {
    useProfileMock.mockReturnValue({
      profile: { latestAssessmentId: null },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DecideRouteClient />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/onboarding");
    });
  });

  it("redirects to /today when assessment exists (no active practices)", async () => {
    // v2: /today is the default destination once an assessment exists; it renders
    // an empty state for 0-active users instead of bouncing to /results.
    useProfileMock.mockReturnValue({
      profile: { latestAssessmentId: "a1", activePracticeIds: [] },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DecideRouteClient />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/today");
    });
  });

  it("redirects to /today when assessment exists, regardless of todayFocusPracticeId", async () => {
    // v2: todayFocusPracticeId is no longer a routing input.
    useProfileMock.mockReturnValue({
      profile: { latestAssessmentId: "a1", todayFocusPracticeId: null },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DecideRouteClient />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/today");
    });
  });

  it("redirects to /auth when unauthenticated", async () => {
    mockAuthStatus = "unauthenticated";
    useProfileMock.mockReturnValue({
      profile: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DecideRouteClient />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/auth");
    });
  });

  it("redirects to /auth on 401 or 403 error", async () => {
    useProfileMock.mockReturnValue({
      profile: null,
      loading: false,
      error: { status: 401 },
      refetch: vi.fn(),
    });

    render(<DecideRouteClient />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/auth");
    });
  });

  it("shows error state on 500 or network error", async () => {
    useProfileMock.mockReturnValue({
      profile: null,
      loading: false,
      error: { status: 500, message: "Server error" },
      refetch: vi.fn(),
    });

    render(<DecideRouteClient />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
