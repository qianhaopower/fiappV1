import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { render, waitFor, cleanup, act } from "@testing-library/react";

const replaceMock = vi.fn();
const routerMock = { replace: replaceMock };

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

// Default to authenticated. Tests can override per-call.
const useAuthenticatorMock = vi.fn(() => ({ authStatus: "authenticated" }));
vi.mock("@aws-amplify/ui-react", () => ({
  useAuthenticator: () => useAuthenticatorMock(),
}));

// ProfileContext — make refetch stable across renders (useCallback in real
// code; we just freeze the reference here so deps don't churn).
const refetchMock = vi.fn(async () => {});
let useProfileReturn: {
  profile: { latestAssessmentId: string | null } | null;
  loading: boolean;
  error: { status?: number } | null;
  refetch: () => Promise<void>;
} = {
  profile: { latestAssessmentId: null },
  loading: false,
  error: null,
  refetch: refetchMock,
};

vi.mock("@/contexts/ProfileContext", () => ({
  useProfile: () => useProfileReturn,
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

// Bypassing the actual button render in error state — not relevant to these
// routing tests and brings in design system noise.
vi.mock("@/components/ui", () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ type: "button", $$typeof: Symbol.for("react.element"), key: null, ref: null, props: { children, onClick } } as any),
}));

vi.mock("@/components/FullPageSpinner", () => ({
  default: () => null,
}));

import DecideRouteClient from "@/components/DecideRouteClient";

const RESULT_KEY = "assessment.result";

function seedLocalResult() {
  window.localStorage.setItem(
    RESULT_KEY,
    JSON.stringify({
      version: 1,
      answers: { "financial-1": true },
      scoresByPillar: {
        financial: 1, relationship: 2, information: 3,
        emotional: 4, nutrition: 5, dynamic: 0, sleep: 2,
      },
      focusPillar: "dynamic",
      lowestPillarId: "dynamic",
      suggestedPracticeIds: ["dynamic-1", "dynamic-2", "dynamic-3"],
      takenAt: new Date().toISOString(),
    })
  );
}

describe("DecideRouteClient — hydration routing", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    refetchMock.mockReset();
    refetchMock.mockResolvedValue(undefined);
    useAuthenticatorMock.mockReturnValue({ authStatus: "authenticated" });
    useProfileReturn = {
      profile: { latestAssessmentId: null },
      loading: false,
      error: null,
      refetch: refetchMock,
    };
    window.localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("redirects to /auth when unauthenticated", async () => {
    useAuthenticatorMock.mockReturnValue({ authStatus: "unauthenticated" });
    render(<DecideRouteClient />);
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/auth");
    });
  });

  it("redirects to /onboarding when authed user has no assessment and no localStorage", async () => {
    render(<DecideRouteClient />);
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/onboarding");
    });
  });

  it("redirects to /today when authed user has an assessment and no localStorage", async () => {
    useProfileReturn.profile = { latestAssessmentId: "asmt-99" };
    render(<DecideRouteClient />);
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/today");
    });
  });

  it("existing user with stale anonymous localStorage: clears local + routes per decideRoute", async () => {
    useProfileReturn.profile = { latestAssessmentId: "asmt-77" };
    seedLocalResult();

    render(<DecideRouteClient />);
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/today");
    });
    // Stale localStorage was dropped silently — server data wins (Decision 4).
    expect(window.localStorage.getItem(RESULT_KEY)).toBeNull();
    // No POST attempt — we only hydrate for users without a server assessment.
    expect((global.fetch as unknown as Mock)).not.toHaveBeenCalled();
  });

  it("anonymous → signup hydration: POSTs answers and routes to /results", async () => {
    seedLocalResult();
    (global.fetch as unknown as Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ assessmentId: "new-asmt-1" }),
    });

    render(<DecideRouteClient />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/results");
    });

    // Server received the stored answers.
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/assessment",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ answers: { "financial-1": true } }),
      }),
    );

    // localStorage cleared after successful persistence.
    expect(window.localStorage.getItem(RESULT_KEY)).toBeNull();

    // refetch was called (fire-and-forget) so ProfileContext stays fresh
    // for sibling pages. Not awaited inside the effect.
    expect(refetchMock).toHaveBeenCalled();
  });

  it("RACE FIX: profile re-renders after hydration must NOT override /results with /today", async () => {
    // The bug this regression test catches:
    //   1) Initial render: profile.latestAssessmentId = null
    //   2) Hydration POSTs successfully, router.replace("/results") fires
    //   3) refetch resolves; profile updates to { latestAssessmentId: "..." }
    //   4) Effect re-runs with stored=null + latestAssessmentId set
    //   5) Without the routedRef guard, this would route to /today,
    //      clobbering the intended /results.
    seedLocalResult();
    (global.fetch as unknown as Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ assessmentId: "new-asmt-2" }),
    });

    const { rerender } = render(<DecideRouteClient />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/results");
    });

    // Now simulate the profile update that refetch would produce. Without
    // the guard, this triggers a re-route to /today.
    await act(async () => {
      useProfileReturn = {
        ...useProfileReturn,
        profile: { latestAssessmentId: "new-asmt-2" },
      };
      rerender(<DecideRouteClient />);
    });

    // /today must NOT have been called — only /results.
    const calls = replaceMock.mock.calls.map((c) => c[0]);
    expect(calls).toContain("/results");
    expect(calls).not.toContain("/today");
  });

  it("hydration failure (non-OK response): falls through to decideRoute (/onboarding)", async () => {
    seedLocalResult();
    (global.fetch as unknown as Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "boom" }),
    });

    render(<DecideRouteClient />);

    await waitFor(() => {
      // profile.latestAssessmentId is still null → /onboarding fallback
      expect(replaceMock).toHaveBeenCalledWith("/onboarding");
    });
    // localStorage is preserved so the user can retry by visiting /results.
    expect(window.localStorage.getItem(RESULT_KEY)).not.toBeNull();
  });

  it("hydration network error: falls through to decideRoute (/onboarding)", async () => {
    seedLocalResult();
    (global.fetch as unknown as Mock).mockRejectedValue(new Error("offline"));

    render(<DecideRouteClient />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/onboarding");
    });
    expect(window.localStorage.getItem(RESULT_KEY)).not.toBeNull();
  });
});
