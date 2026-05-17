import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlanBadge } from "@/components/PlanBadge";

const useProfileMock = vi.fn();

vi.mock("@/contexts/ProfileContext", () => ({
  useProfile: () => useProfileMock(),
}));

describe("PlanBadge", () => {
  beforeEach(() => {
    useProfileMock.mockReset();
  });

  it("renders null when loading", () => {
    useProfileMock.mockReturnValue({
      profile: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<PlanBadge />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null when no profile", () => {
    useProfileMock.mockReturnValue({
      profile: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<PlanBadge />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null when profile has no subscriptionStatus", () => {
    useProfileMock.mockReturnValue({
      profile: { userId: "u1" },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<PlanBadge />);
    expect(container.firstChild).toBeNull();
  });

  it("renders Free plan as an upgrade-triggering button when subscriptionStatus is FREE", () => {
    useProfileMock.mockReturnValue({
      profile: { subscriptionStatus: "FREE" },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<PlanBadge />);
    const badge = screen.getByRole("button", { name: /Plan: Free plan\. Upgrade to Plus\./ });
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Free plan");
  });

  it("renders Plus plan when subscriptionStatus is PAID", () => {
    useProfileMock.mockReturnValue({
      profile: { subscriptionStatus: "PAID" },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<PlanBadge />);
    expect(screen.getByText("Plus plan")).toBeInTheDocument();
    expect(screen.getByLabelText("Plan: Plus plan")).toBeInTheDocument();
  });
});
