// Transient pre-account state for the anonymous assessment funnel.
// Cleared on signup hydration. Never read for an authenticated user.
// See _docs/plans/anonymous-assessment-funnel.md and the db-schema.md
// invariant: DynamoDB is the source of truth for all authenticated state;
// localStorage holds only this transient pre-account state.

import type { Pillar } from "@/lib/assessment/pillars";

const RESULT_KEY = "assessment.result";
const DRAFT_KEY = "assessment.draft";
const CURRENT_VERSION = 1;

export type LocalAssessmentResult = {
  version: 1;
  answers: Record<string, boolean>;
  scoresByPillar: Record<Pillar, number>;
  focusPillar: Pillar;
  lowestPillarId: Pillar;
  suggestedPracticeIds: string[];
  takenAt: string; // ISO
};

export type LocalAssessmentDraft = {
  version: 1;
  answers: Record<string, boolean>;
  index: number;
  startedAt: string; // ISO
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function readLocalResult(): LocalAssessmentResult | null {
  if (!isBrowser()) return null;
  const parsed = safeParse<LocalAssessmentResult>(window.localStorage.getItem(RESULT_KEY));
  if (!parsed || parsed.version !== CURRENT_VERSION) return null;
  return parsed;
}

export function writeLocalResult(r: LocalAssessmentResult): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(RESULT_KEY, JSON.stringify(r));
  } catch {
    // Storage quota exceeded, Safari ITP, etc. Best-effort — fail silently.
  }
}

export function clearLocalResult(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(RESULT_KEY);
  } catch {
    // ignore
  }
}

export function readLocalDraft(): LocalAssessmentDraft | null {
  if (!isBrowser()) return null;
  const parsed = safeParse<LocalAssessmentDraft>(window.localStorage.getItem(DRAFT_KEY));
  if (!parsed || parsed.version !== CURRENT_VERSION) return null;
  return parsed;
}

export function writeLocalDraft(d: LocalAssessmentDraft): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    // ignore
  }
}

export function clearLocalDraft(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function ageInDays(takenAt: string): number {
  const t = Date.parse(takenAt);
  if (Number.isNaN(t)) return 0;
  return (Date.now() - t) / 86_400_000;
}

export const STALE_AGE_DAYS = 30;
