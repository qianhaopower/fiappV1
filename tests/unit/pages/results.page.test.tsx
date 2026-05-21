import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";

import ResultsPage from "@/app/results/page";
import type { LocalAssessmentResult } from "@/lib/assessment/localResult";

const replaceMock = vi.fn();
const pushMock = vi.fn();

// The router object reference must stay stable across renders — the page's
// useCallback (loadAnonymous) depends on `router`, and a fresh object on
// every render would cause an infinite re-render loop in tests.
const routerMock = { replace: replaceMock, push: pushMock };

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

// Default to unauthenticated — most tests in this file cover the anonymous
// mode, which is the new surface in this PR. Individual tests can override.
const useAuthenticatorMock = vi.fn(() => ({ authStatus: "unauthenticated" }));
vi.mock("@aws-amplify/ui-react", () => ({
  useAuthenticator: () => useAuthenticatorMock(),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

// The radar component imports d3 dynamically. Stub to a placeholder so
// jsdom doesn't try to render canvas paths.
vi.mock("@/components/ui/PillarRadarChart", () => ({
  PillarRadarChart: () => null,
}));

function makeResult(overrides: Partial<LocalAssessmentResult> = {}): LocalAssessmentResult {
  return {
    version: 1,
    answers: {},
    scoresByPillar: {
      financial: 3, relationship: 2, information: 4,
      emotional: 5, nutrition: 5, dynamic: 5, sleep: 0,
    },
    focusPillar: "sleep",
    lowestPillarId: "sleep",
    // First three real practice IDs from the sleep pillar in lib/practices/library.ts —
    // letting the page do its real lookup. If the practice IDs change the test will
    // fail loudly, which is the right signal.
    suggestedPracticeIds: ["sleep-consistent-bedtime", "sleep-morning-light", "sleep-dim-before-bed"],
    takenAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("ResultsPage — anonymous mode", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    pushMock.mockReset();
    useAuthenticatorMock.mockReturnValue({ authStatus: "unauthenticated" });
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("redirects to /assessment when localStorage has no result", async () => {
    render(<ResultsPage />);
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/assessment");
    });
  });

  it("renders the focus pillar and pillar-aware signup CTA from localStorage", async () => {
    window.localStorage.setItem("assessment.result", JSON.stringify(makeResult()));
    render(<ResultsPage />);

    // Focus Pillar card uses pillarLabels[focusPillar] + " Intelligence"
    await waitFor(() => {
      expect(screen.getByText(/Sleep Intelligence/)).toBeInTheDocument();
    });

    // Pillar-aware bottom CTA references the focus pillar label.
    expect(
      screen.getByText(/Sign up free to start your Sleep practice/i)
    ).toBeInTheDocument();
  });

  it("renders 'Sign up to start' on each practice card (no 'Start this practice')", async () => {
    window.localStorage.setItem("assessment.result", JSON.stringify(makeResult()));
    render(<ResultsPage />);

    await waitFor(() => {
      // 3 suggested practice cards × 1 button = 3 anonymous CTAs.
      expect(
        screen.getAllByRole("link", { name: /Sign up to start/i }).length
      ).toBeGreaterThanOrEqual(1);
    });

    // The authed-mode label must not appear for anonymous users.
    expect(screen.queryByRole("button", { name: "Start this practice" })).not.toBeInTheDocument();
    // No "Active" or "Paused" badges either (anonymous users have no UPRACTICE rows).
    expect(screen.queryByText(/^Active$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Paused$/)).not.toBeInTheDocument();
  });

  it("shows the stale-age banner when takenAt is older than 30 days", async () => {
    const stale = new Date(Date.now() - 45 * 86_400_000).toISOString();
    window.localStorage.setItem(
      "assessment.result",
      JSON.stringify(makeResult({ takenAt: stale }))
    );
    render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Your result is 45 days old/i)).toBeInTheDocument();
    });
  });

  it("does NOT show the stale-age banner for a fresh result", async () => {
    window.localStorage.setItem("assessment.result", JSON.stringify(makeResult()));
    render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Sleep Intelligence/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/days old/i)).not.toBeInTheDocument();
  });

  it("'Retake (clears your result)' clears localStorage and routes to /assessment", async () => {
    window.localStorage.setItem("assessment.result", JSON.stringify(makeResult()));
    render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Retake \(clears your result\)/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Retake \(clears your result\)/));

    expect(window.localStorage.getItem("assessment.result")).toBeNull();
    expect(replaceMock).toHaveBeenCalledWith("/assessment");
  });

  it("does NOT render the authed-only 'Go to Today' CTA", async () => {
    window.localStorage.setItem("assessment.result", JSON.stringify(makeResult()));
    render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Sleep Intelligence/)).toBeInTheDocument();
    });
    expect(screen.queryByRole("link", { name: /Go to Today/i })).not.toBeInTheDocument();
  });
});
