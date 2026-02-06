"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { assessmentQuestions } from "@/lib/assessment/questions";
import { Button } from "@/components/ui";

export default function AssessmentPage() {
  const router = useRouter();
  const total = assessmentQuestions.length;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = assessmentQuestions[index];
  const currentAnswer = answers[current.id];
  const canProceed = typeof currentAnswer === "boolean";

  const progressLabel = useMemo(
    () => `${index + 1} / ${total}`,
    [index, total]
  );

  function handleAnswer(value: boolean) {
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
    setError(null);
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

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-xl p-10">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Assessment
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">
          Quick check-in
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Answer each prompt with yes or no. You can go back anytime.
        </p>

        <div className="mt-8 rounded-xl border border-border/60 bg-muted/20 p-6">
          <div className="text-sm text-muted-foreground">{progressLabel}</div>
          <div className="mt-3 text-lg font-medium text-foreground">
            {current.text}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
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

        {error && (
          <div className="mt-4 text-sm text-destructive">{error}</div>
        )}

        <div className="mt-8 flex items-center justify-between">
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
      </div>
    </main>
  );
}
