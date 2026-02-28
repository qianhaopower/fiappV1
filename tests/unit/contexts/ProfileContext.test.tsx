import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ProfileProvider, useProfile } from "@/contexts/ProfileContext";

function Consumer() {
  const { profile, loading, error, refetch } = useProfile();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="profile">{profile ? JSON.stringify(profile) : "null"}</span>
      <span data-testid="error">{error ? JSON.stringify(error) : "null"}</span>
      <button onClick={() => refetch()}>Refetch</button>
    </div>
  );
}

const fetchMeMock = vi.fn();

vi.mock("@aws-amplify/ui-react", () => ({
  useAuthenticator: () => ({ authStatus: "authenticated" }),
}));

vi.mock("@/lib/apiClient", () => ({
  fetchMe: (...args: unknown[]) => fetchMeMock(...args),
}));

describe("ProfileContext", () => {
  beforeEach(() => {
    fetchMeMock.mockReset();
  });

  it("provides loading then profile when fetch succeeds", async () => {
    const mockProfile = {
      userId: "u1",
      subscriptionStatus: "FREE",
      latestAssessmentId: null,
    };

    fetchMeMock.mockResolvedValue({
      status: 200,
      data: { ok: true, data: mockProfile, profile: mockProfile },
    });

    render(
      <ProfileProvider>
        <Consumer />
      </ProfileProvider>
    );

    expect(screen.getByTestId("loading")).toHaveTextContent("true");

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("profile")).toHaveTextContent("FREE");
    expect(fetchMeMock).toHaveBeenCalledTimes(1);
  });

  it("provides error when fetch returns 401", async () => {
    fetchMeMock.mockResolvedValue({
      status: 401,
      data: null,
    });

    render(
      <ProfileProvider>
        <Consumer />
      </ProfileProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("profile")).toHaveTextContent("null");
    expect(screen.getByTestId("error")).not.toHaveTextContent("null");
  });

  it("refetch updates profile", async () => {
    const profile1 = { userId: "u1", subscriptionStatus: "FREE" };
    const profile2 = { userId: "u1", subscriptionStatus: "PAID" };

    fetchMeMock
      .mockResolvedValueOnce({
        status: 200,
        data: { ok: true, data: profile1, profile: profile1 },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: { ok: true, data: profile2, profile: profile2 },
      });

    render(
      <ProfileProvider>
        <Consumer />
      </ProfileProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("profile")).toHaveTextContent("FREE");
    });

    fireEvent.click(screen.getByRole("button", { name: "Refetch" }));

    await waitFor(() => {
      expect(screen.getByTestId("profile")).toHaveTextContent("PAID");
    });

    expect(fetchMeMock).toHaveBeenCalledTimes(2);
  });
});
