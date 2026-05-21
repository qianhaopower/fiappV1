import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  readLocalResult,
  writeLocalResult,
  clearLocalResult,
  readLocalDraft,
  writeLocalDraft,
  clearLocalDraft,
  ageInDays,
  STALE_AGE_DAYS,
  type LocalAssessmentResult,
  type LocalAssessmentDraft,
} from "@/lib/assessment/localResult";

// Tiny in-memory localStorage shim. Vitest's default jsdom env has a real one
// but resetting it between tests is the awkward part — easier to swap in a
// fresh shim per test.
function setupLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    },
  });
  return store;
}

const result: LocalAssessmentResult = {
  version: 1,
  answers: { "financial-1": true, "sleep-3": false },
  scoresByPillar: {
    financial: 3, relationship: 2, information: 4,
    emotional: 1, nutrition: 5, dynamic: 3, sleep: 0,
  },
  focusPillar: "sleep",
  lowestPillarId: "sleep",
  suggestedPracticeIds: ["sleep-1", "sleep-2", "sleep-3"],
  takenAt: "2026-05-20T10:00:00.000Z",
};

const draft: LocalAssessmentDraft = {
  version: 1,
  answers: { "financial-1": true },
  index: 5,
  startedAt: "2026-05-20T10:00:00.000Z",
};

describe("localResult", () => {
  beforeEach(() => {
    setupLocalStorage();
  });

  describe("result round-trip", () => {
    it("writes and reads back", () => {
      writeLocalResult(result);
      const read = readLocalResult();
      expect(read).toEqual(result);
    });

    it("returns null when empty", () => {
      expect(readLocalResult()).toBeNull();
    });

    it("clears stored result", () => {
      writeLocalResult(result);
      clearLocalResult();
      expect(readLocalResult()).toBeNull();
    });

    it("returns null for malformed JSON", () => {
      window.localStorage.setItem("assessment.result", "{not json");
      expect(readLocalResult()).toBeNull();
    });

    it("returns null when version mismatches", () => {
      window.localStorage.setItem(
        "assessment.result",
        JSON.stringify({ ...result, version: 999 })
      );
      expect(readLocalResult()).toBeNull();
    });
  });

  describe("draft round-trip", () => {
    it("writes and reads back", () => {
      writeLocalDraft(draft);
      expect(readLocalDraft()).toEqual(draft);
    });

    it("clears stored draft", () => {
      writeLocalDraft(draft);
      clearLocalDraft();
      expect(readLocalDraft()).toBeNull();
    });

    it("returns null when version mismatches", () => {
      window.localStorage.setItem(
        "assessment.draft",
        JSON.stringify({ ...draft, version: 999 })
      );
      expect(readLocalDraft()).toBeNull();
    });
  });

  describe("ageInDays", () => {
    it("computes recent age within sub-day precision", () => {
      const recent = new Date(Date.now() - 6 * 3600_000).toISOString();
      const days = ageInDays(recent);
      expect(days).toBeGreaterThanOrEqual(0.24);
      expect(days).toBeLessThan(0.3);
    });

    it("returns 0 for malformed input rather than NaN", () => {
      expect(ageInDays("not-a-date")).toBe(0);
    });

    it("STALE_AGE_DAYS is 30", () => {
      expect(STALE_AGE_DAYS).toBe(30);
    });

    it("crosses the staleness threshold at exactly 30 days", () => {
      const day29 = new Date(Date.now() - 29.5 * 86_400_000).toISOString();
      const day31 = new Date(Date.now() - 30.5 * 86_400_000).toISOString();
      expect(ageInDays(day29)).toBeLessThan(STALE_AGE_DAYS);
      expect(ageInDays(day31)).toBeGreaterThan(STALE_AGE_DAYS);
    });
  });

  describe("SSR safety", () => {
    it("read/write/clear are no-ops when window is undefined", () => {
      vi.stubGlobal("window", undefined);
      expect(readLocalResult()).toBeNull();
      expect(readLocalDraft()).toBeNull();
      // Don't throw:
      writeLocalResult(result);
      writeLocalDraft(draft);
      clearLocalResult();
      clearLocalDraft();
    });
  });
});
