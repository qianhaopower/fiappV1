"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { assessmentQuestions } from "@/lib/assessment/questions";
import { pillarColors } from "@/lib/design/pillarColors";
import { NarrowFormPage } from "@/components/layout";
import { Button, Card } from "@/components/ui";

export default function AssessmentPage() {
  const router = useRouter();
  const total = assessmentQuestions.length;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      if (res.status === 401 || res.status === 403) {
        router.replace("/auth");
        return;
      }

      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }

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
  }

  return (
    <NarrowFormPage
      title=""
    >
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
          FRIENDS INTELLIGENCE · ASSESSMENT
        </p>
        <Card>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Question {progressLabel}</span>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs uppercase tracking-[0.2em]">
                {percentAnswered}% complete
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
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
                  ? "inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                  : "inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-semibold text-foreground"
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

            <div className="mt-4 min-h-[3.5rem] text-xl font-semibold leading-7 text-foreground">
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
    </NarrowFormPage>
  );
}
