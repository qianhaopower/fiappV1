import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DevSubscriptionToggle } from "@/components/DevSubscriptionToggle";

const refetchMock = vi.fn();
const useProfileMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("@/contexts/ProfileContext", () => ({
  useProfile: () => useProfileMock(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

describe("DevSubscriptionToggle", () => {
  const originalEnv = process.env.NEXT_PUBLIC_FIAPP_DEV_SUBSCRIPTION;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_FIAPP_DEV_SUBSCRIPTION = "true";
    refetchMock.mockReset();
    refetchMock.mockResolvedValue(undefined);
    useProfileMock.mockReturnValue({
      profile: { subscriptionStatus: "FREE" },
      loading: false,
      error: null,
      refetch: refetchMock,
    });
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_FIAPP_DEV_SUBSCRIPTION = originalEnv;
    vi.unstubAllGlobals();
  });

  it("renders null when NEXT_PUBLIC_FIAPP_DEV_SUBSCRIPTION is not true", () => {
    process.env.NEXT_PUBLIC_FIAPP_DEV_SUBSCRIPTION = "false";

    const { container } = render(<DevSubscriptionToggle />);
    expect(container.firstChild).toBeNull();
  });

  it("renders Free and Plus buttons when flag is true", () => {
    render(<DevSubscriptionToggle />);

    expect(screen.getByRole("button", { name: "Free" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Plus" })).toBeInTheDocument();
  });

  it("calls fetch and refetch when Plus is clicked", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<DevSubscriptionToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Plus" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/dev/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subscriptionStatus: "PAID" }),
      });
    });

    await waitFor(() => {
      expect(refetchMock).toHaveBeenCalled();
    });

    expect(toastSuccessMock).toHaveBeenCalledWith("Set to Plus plan");
  });

  it("calls fetch and refetch when Free is clicked", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<DevSubscriptionToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Free" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/dev/subscription",
        expect.objectContaining({
          body: JSON.stringify({ subscriptionStatus: "FREE" }),
        })
      );
    });

    await waitFor(() => {
      expect(refetchMock).toHaveBeenCalled();
    });

    expect(toastSuccessMock).toHaveBeenCalledWith("Set to Free plan");
  });

  it("shows error toast when fetch fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<DevSubscriptionToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Plus" }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("Failed to update", {
        description: expect.any(String),
      });
    });

    expect(refetchMock).toHaveBeenCalledTimes(0);
  });
});
