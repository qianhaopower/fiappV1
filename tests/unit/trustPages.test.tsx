import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";
import DisclaimerPage from "@/app/disclaimer/page";
import ContactPage from "@/app/contact/page";

describe("Trust pages render without errors", () => {
  it("Privacy page renders key content", () => {
    render(<PrivacyPage />);
    expect(screen.getByRole("heading", { name: /privacy policy/i })).toBeInTheDocument();
    expect(screen.getByText(/what we collect/i)).toBeInTheDocument();
  });

  it("Terms page renders key content", () => {
    render(<TermsPage />);
    expect(screen.getByRole("heading", { name: /terms of use/i })).toBeInTheDocument();
  });

  it("Disclaimer page renders key content", () => {
    render(<DisclaimerPage />);
    expect(screen.getByRole("heading", { name: /not professional advice/i })).toBeInTheDocument();
    expect(screen.getByText(/what it is not/i)).toBeInTheDocument();
  });

  it("Contact page renders key content", () => {
    render(<ContactPage />);
    expect(screen.getByRole("heading", { name: /get in touch/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /hello@friendsintelligence\.net/i })).toBeInTheDocument();
  });
});
