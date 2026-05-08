import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingPage from "@/app/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@aws-amplify/ui-react", () => ({
  useAuthenticator: () => ({ authStatus: "unauthenticated" }),
}));

vi.mock("@/components/LandingAuthRedirect", () => ({
  default: () => null,
}));

describe("Root page (/)", () => {
  it("renders the landing page hero", () => {
    render(<LandingPage />);
    const ctaLinks = screen.getAllByRole("link", { name: /Start free assessment/i });
    expect(ctaLinks.length).toBeGreaterThan(0);
  });

  it("renders all 7 pillar names", () => {
    render(<LandingPage />);
    expect(screen.getByText("Finance")).toBeInTheDocument();
    expect(screen.getByText("Relationship")).toBeInTheDocument();
    expect(screen.getByText("Sleep")).toBeInTheDocument();
  });
});
