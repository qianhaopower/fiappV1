import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

import CookieBanner from "@/components/CookieBanner";

// The banner is the *only* gate that loads GA4. If it misbehaves we either
// fire analytics without consent (GDPR risk) or never fire them at all
// (silent launch with no funnel data). Both are bad enough to want explicit
// coverage on this small surface.

describe("CookieBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("renders the banner on first visit (no prior consent)", async () => {
    render(<CookieBanner />);
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /accept/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /decline/i })).toBeVisible();
  });

  it("does NOT render when consent was previously accepted", async () => {
    window.localStorage.setItem("cookie_consent", "accepted");
    render(<CookieBanner />);
    // Wait a frame to let the mount effect settle.
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("does NOT render when consent was previously declined", async () => {
    window.localStorage.setItem("cookie_consent", "declined");
    render(<CookieBanner />);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("clicking Accept writes 'accepted' to localStorage and hides the banner", async () => {
    render(<CookieBanner />);
    await waitFor(() => screen.getByRole("button", { name: /accept/i }));
    fireEvent.click(screen.getByRole("button", { name: /accept/i }));
    await waitFor(() => {
      expect(window.localStorage.getItem("cookie_consent")).toBe("accepted");
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clicking Decline writes 'declined' to localStorage and hides the banner", async () => {
    render(<CookieBanner />);
    await waitFor(() => screen.getByRole("button", { name: /decline/i }));
    fireEvent.click(screen.getByRole("button", { name: /decline/i }));
    await waitFor(() => {
      expect(window.localStorage.getItem("cookie_consent")).toBe("declined");
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("dispatches a fiapp:cookie-consent event when the user decides", async () => {
    const listener = vi.fn();
    window.addEventListener("fiapp:cookie-consent", listener);
    render(<CookieBanner />);
    await waitFor(() => screen.getByRole("button", { name: /accept/i }));
    fireEvent.click(screen.getByRole("button", { name: /accept/i }));
    await waitFor(() => expect(listener).toHaveBeenCalled());
    window.removeEventListener("fiapp:cookie-consent", listener);
  });
});
