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

  it("renders Free when subscriptionStatus is FREE", () => {
    useProfileMock.mockReturnValue({
      profile: { subscriptionStatus: "FREE" },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<PlanBadge />);
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByLabelText("Plan: Free")).toBeInTheDocument();
  });

  it("renders Premium when subscriptionStatus is PAID", () => {
    useProfileMock.mockReturnValue({
      profile: { subscriptionStatus: "PAID" },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<PlanBadge />);
    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.getByLabelText("Plan: Premium")).toBeInTheDocument();
  });
});
