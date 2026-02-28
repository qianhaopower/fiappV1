import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UpgradeButton } from "@/components/UpgradeButton";

const useProfileMock = vi.fn();
const toastMock = vi.fn();

vi.mock("@/contexts/ProfileContext", () => ({
  useProfile: () => useProfileMock(),
}));

vi.mock("sonner", () => ({
  toast: {
    info: (...args: unknown[]) => toastMock(...args),
  },
}));

describe("UpgradeButton", () => {
  beforeEach(() => {
    useProfileMock.mockReset();
    toastMock.mockReset();
  });

  it("renders null when loading", () => {
    useProfileMock.mockReturnValue({
      profile: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<UpgradeButton />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null when subscriptionStatus is PAID", () => {
    useProfileMock.mockReturnValue({
      profile: { subscriptionStatus: "PAID" },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<UpgradeButton />);
    expect(container.firstChild).toBeNull();
  });

  it("renders Upgrade button when subscriptionStatus is FREE", () => {
    useProfileMock.mockReturnValue({
      profile: { subscriptionStatus: "FREE" },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UpgradeButton />);
    expect(screen.getByRole("button", { name: "Upgrade" })).toBeInTheDocument();
  });

  it("calls toast.info on click when FREE", () => {
    useProfileMock.mockReturnValue({
      profile: { subscriptionStatus: "FREE" },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UpgradeButton />);
    fireEvent.click(screen.getByRole("button", { name: "Upgrade" }));

    expect(toastMock).toHaveBeenCalledWith("Upgrade coming soon", {
      description: "Premium features are in development.",
    });
  });
});
