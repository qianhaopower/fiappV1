import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AuthGate from "@/components/AuthGate";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const getCurrentUserMock = vi.fn();
vi.mock("aws-amplify/auth", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

const ensureAmplifyConfiguredMock = vi.fn();
vi.mock("@/lib/amplifyClient", () => ({
  ensureAmplifyConfigured: () => ensureAmplifyConfiguredMock(),
}));

vi.mock("@/lib/testAuthMock", () => ({
  getE2EAuthMock: () => null,
}));

describe("AuthGate", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    getCurrentUserMock.mockReset();
    ensureAmplifyConfiguredMock.mockReset();
  });

  it("redirects signed-in users to /decideRoute", async () => {
    getCurrentUserMock.mockResolvedValue({ username: "user" });

    render(
      <AuthGate>
        <div>Auth UI</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/decideRoute");
    });
  });

  it("renders children when signed out", async () => {
    getCurrentUserMock.mockRejectedValue(new Error("No user"));

    render(
      <AuthGate>
        <div>Auth UI</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(screen.getByText("Auth UI")).toBeInTheDocument();
    });
  });

  it("calls ensureAmplifyConfigured on mount", async () => {
    getCurrentUserMock.mockRejectedValue(new Error("No user"));

    render(
      <AuthGate>
        <div>Auth UI</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(ensureAmplifyConfiguredMock).toHaveBeenCalled();
    });
  });
});
