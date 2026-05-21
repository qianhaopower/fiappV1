"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { assessmentQuestions } from "@/lib/assessment/questions";
import { pillarColors } from "@/lib/design/pillarColors";
import { NarrowFormPage } from "@/components/layout";
import { Button, Card } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  readLocalDraft,
  writeLocalDraft,
  clearLocalDraft,
  writeLocalResult,
} from "@/lib/assessment/localResult";
import type { Pillar } from "@/lib/assessment/pillars";
import { trackEvent } from "@/lib/analytics";

export default function AssessmentPage() {
  const router = useRouter();
  const { authStatus } = useAuthenticator((c) => [c.authStatus]);
  const isAnonymous = authStatus !== "authenticated";
  const total = assessmentQuestions.length;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [introAccepted, setIntroAccepted] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [hydratedFromDraft, setHydratedFromDraft] = useState(false);

  // Fire once per page mount, after auth status has resolved (no point firing
  // before we know if the user is anonymous).
  useEffect(() => {
    if (authStatus === "configuring") return;
    trackEvent("assessment_started", { is_anonymous: isAnonymous });
  }, [authStatus, isAnonymous]);

  // On mount, restore in-progress answers from localStorage so a refresh or
  // tab-close doesn't lose the user's work. Anonymous users especially — they
  // have no server-side row to recover from. See plan §localStorage lifecycle.
  useEffect(() => {
    const draft = readLocalDraft();
    if (draft && Object.keys(draft.answers).length > 0) {
      setAnswers(draft.answers);
      setIndex(Math.min(draft.index, total - 1));
      setIntroAccepted(true);
    }
    setHydratedFromDraft(true);
  }, [total]);

  // Persist in-progress answers as they change. Skip until the hydration
  // pass has finished — otherwise the initial mount writes an empty draft
  // before we can read the existing one.
  useEffect(() => {
    if (!hydratedFromDraft) return;
    if (!introAccepted) return;
    if (Object.keys(answers).length === 0 && index === 0) return;
    const existing = readLocalDraft();
    writeLocalDraft({
      version: 1,
      answers,
      index,
      startedAt: existing?.startedAt ?? new Date().toISOString(),
    });
  }, [answers, index, introAccepted, hydratedFromDraft]);

  function getContrastingTextColor(hex: string) {
    const match = /^#?([0-9a-fA-F]{6})$/.exec(hex);
    if (!match) return "hsl(var(--foreground))";
    const value = match[1];
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);

    const toLinear = (c: number) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };

    const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    return L < 0.55 ? "#ffffff" : "#111827";
  }

  const current = assessmentQuestions[index];
  const currentAnswer = answers[current.id];
  const canProceed = typeof currentAnswer === "boolean";
  const answeredCount = Object.keys(answers).length;
  const percentAnswered = Math.round((answeredCount / total) * 100);
  const pillarLabelMap: Record<string, string> = {
    financial: "Financial Intelligence",
    relationship: "Relationship Intelligence",
    information: "Information Intelligence",
    emotional: "Emotional Intelligence",
    nutrition: "Nutrition Intelligence",
    dynamic: "Dynamic Intelligence",
    sleep: "Sleep Intelligence",
  };
  const pillarLabel = pillarLabelMap[current.pillar] ?? current.pillar;
  const pillarColor = pillarColors[current.pillar];
  const pillarTextColor = pillarColor
    ? getContrastingTextColor(pillarColor)
    : undefined;

  const progressLabel = useMemo(
    () => `${index + 1} / ${total}`,
    [index, total]
  );

  function handleAnswer(value: boolean) {
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
    setError(null);
    if (index < total - 1) {
      setIndex((prev) => Math.min(total - 1, prev + 1));
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }

      const data = (await res.json()) as {
        assessmentId?: string;
        focusPillar: Pillar;
        lowestPillarId: Pillar;
        scoresByPillar: Record<Pillar, number>;
        suggestedPracticeIds: string[];
      };

      // Persist for anonymous submissions only. Authed submissions already
      // wrote ASSESS# server-side — /results in authed mode reads from the
      // server, not localStorage. Writing here for authed users would just
      // leave stale data behind after logout for the next visitor on this
      // browser to stumble into.
      if (!data.assessmentId) {
        writeLocalResult({
          version: 1,
          answers,
          scoresByPillar: data.scoresByPillar,
          focusPillar: data.focusPillar,
          lowestPillarId: data.lowestPillarId,
          suggestedPracticeIds: data.suggestedPracticeIds,
          takenAt: new Date().toISOString(),
        });
      }
      clearLocalDraft();

      trackEvent("assessment_submitted", {
        is_anonymous: !data.assessmentId,
        focus_pillar: data.focusPillar,
      });

      router.replace("/results");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setAnswers({});
    setIndex(0);
    setError(null);
    setSubmitting(false);
    clearLocalDraft();
  }

  function confirmAndReset() {
    handleReset();
    setConfirmRestart(false);
  }

  if (!introAccepted) {
    return (
      <NarrowFormPage title="">
        <div className="space-y-3">
          <p className="text-xs tracking-[0.12em] text-muted-foreground">
            Friends Intelligence · Assessment
          </p>
          <Card>
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-semibold text-foreground">Before you begin</h1>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  This assessment helps you see where you stand across the seven Friends Intelligence pillars — Financial, Relationship, Information, Emotional, Nutrition, Dynamic, and Sleep.
                </p>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-primary font-semibold shrink-0">35</span>
                  <span>yes/no questions — takes about 8 minutes</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-primary font-semibold shrink-0">→</span>
                  <span>Answer based on the last 7–14 days, not how you want things to be</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-primary font-semibold shrink-0">✓</span>
                  <span>Scores are for self-reflection only — not a diagnosis or judgment</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-primary font-semibold shrink-0">→</span>
                  <span>You can retake it any time from your account</span>
                </li>
              </ul>
              <p className="rounded-lg bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
                After this, you&apos;ll get a focus pillar, try one small practice from it, and check in daily.
              </p>
              <Button className="w-full" onClick={() => setIntroAccepted(true)}>
                Start assessment →
              </Button>
            </div>
          </Card>
          <p className="text-xs text-muted-foreground text-center">
            For personal reflection only —{' '}
            <Link href="/disclaimer" className="underline underline-offset-2 hover:text-foreground">not professional advice</Link>.
          </p>
        </div>
      </NarrowFormPage>
    );
  }

  return (
    <NarrowFormPage
      title=""
    >
      <div className="space-y-3">
        <p className="text-xs tracking-[0.12em] text-muted-foreground">
          Friends Intelligence · Assessment
        </p>
        <Card>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Question {progressLabel}</span>
            <div className="ml-auto flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmRestart(true)}
                disabled={submitting || answeredCount === 0}
              >
                Restart
              </Button>
            </div>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            Answer Yes if this is true for you most days in the last 7–14 days.
          </p>

          <div className="mt-3 h-2 w-full rounded-full bg-muted/40">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${percentAnswered}%` }}
            />
          </div>

          <Card variant="subtle" className="mt-6">
            <span
              className={
                pillarColor
                  ? "inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                  : "inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-semibold text-foreground"
              }
              style={
                pillarColor && pillarTextColor
                  ? {
                      backgroundColor: pillarColor,
                      borderColor: pillarColor,
                      color: pillarTextColor,
                    }
                  : undefined
              }
            >
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={
                  pillarColor && pillarTextColor
                    ? {
                        backgroundColor:
                          pillarTextColor === "#ffffff"
                            ? "rgba(255,255,255,0.9)"
                            : "rgba(17,24,39,0.75)",
                      }
                    : pillarColor
                      ? { backgroundColor: pillarColor }
                      : undefined
                }
              />
              {pillarLabel}
            </span>

            <div className="mt-4 min-h-[10rem] sm:min-h-[7rem] text-xl font-semibold leading-7 text-foreground">
              {current.text}
            </div>

            <div className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={currentAnswer === true ? "default" : "outline"}
                  onClick={() => handleAnswer(true)}
                  disabled={submitting}
                >
                  Yes
                </Button>
                <Button
                  type="button"
                  variant={currentAnswer === false ? "default" : "outline"}
                  onClick={() => handleAnswer(false)}
                  disabled={submitting}
                >
                  No
                </Button>
              </div>
            </div>
          </Card>

          {error && <div className="mt-4 text-sm text-destructive">{error}</div>}

          <div className="mt-6 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
              disabled={index === 0 || submitting}
            >
              Back
            </Button>

            {index < total - 1 ? (
              <Button
                type="button"
                onClick={() => setIndex((prev) => Math.min(total - 1, prev + 1))}
                disabled={!canProceed || submitting}
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!canProceed || submitting}
              >
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            )}
          </div>
        </Card>
      </div>
      <p className="text-xs text-muted-foreground text-center pt-2">
        This assessment is for personal reflection only —{' '}
        <Link href="/disclaimer" className="underline underline-offset-2 hover:text-foreground">not professional advice</Link>.
      </p>

      <Dialog open={confirmRestart} onOpenChange={setConfirmRestart}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start the assessment again?</DialogTitle>
            <DialogDescription>
              This goes back to the first question and clears your{' '}
              {answeredCount} {answeredCount === 1 ? 'answer' : 'answers'} so far.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmRestart(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={confirmAndReset}>
              Start again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </NarrowFormPage>
  );
}
