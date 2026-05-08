"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { pillarOrder, pillarLabels } from "@/lib/assessment/pillars";
import { pillarColors } from "@/lib/design/pillarColors";
import { Button } from "@/components/ui";

const STEPS = 3;

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: STEPS }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === current ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <p className="text-xs tracking-[0.12em] uppercase text-muted-foreground">
          Friends Intelligence
        </p>
        <h1 className="text-2xl font-semibold text-foreground leading-snug">
          Welcome.
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Friends Intelligence is a framework for building the habits that matter most across the seven areas of a well-lived life.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This app helps you assess where you are today, find your focus, and build one small practice at a time — day by day.
        </p>
      </div>
      <Button className="w-full" onClick={onNext}>
        Continue →
      </Button>
    </div>
  );
}

function StepPillars({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <p className="text-xs tracking-[0.12em] uppercase text-muted-foreground">
          The framework
        </p>
        <h1 className="text-2xl font-semibold text-foreground leading-snug">
          7 areas of your life
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You&apos;ll get a score for each. The one with the most room to grow becomes your starting focus.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {pillarOrder.map((pillar) => {
          const color = pillarColors[pillar];
          return (
            <span
              key={pillar}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: color, borderColor: color, color: "#fff" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
              {pillarLabels[pillar]}
            </span>
          );
        })}
      </div>
      <Button className="w-full" onClick={onNext}>
        Continue →
      </Button>
    </div>
  );
}

function StepLoop({ onDone }: { onDone: () => void }) {
  const steps = [
    { label: "Assess", desc: "Answer 35 yes/no questions across all 7 pillars" },
    { label: "Focus", desc: "Your lowest-opportunity pillar becomes your focus area" },
    { label: "Practice", desc: "Try one small practice from your focus pillar" },
    { label: "Check in", desc: "Each day, log whether you did it — build the streak" },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <p className="text-xs tracking-[0.12em] uppercase text-muted-foreground">
          How it works
        </p>
        <h1 className="text-2xl font-semibold text-foreground leading-snug">
          One loop. Repeated.
        </h1>
      </div>
      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-start gap-4">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[0.7rem] font-semibold text-primary-foreground">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
      <Button className="w-full" onClick={onDone}>
        Take your first assessment →
      </Button>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  function next() {
    setStep((s) => s + 1);
  }

  function done() {
    router.replace("/assessment");
  }

  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <header className="border-b border-border px-6">
        <div className="mx-auto flex h-14 max-w-lg items-center">
          <span className="text-sm font-semibold text-foreground">
            Friends Intelligence
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 py-12">
        <div className="mb-8">
          <StepDots current={step} />
        </div>

        {step === 0 && <StepWelcome onNext={next} />}
        {step === 1 && <StepPillars onNext={next} />}
        {step === 2 && <StepLoop onDone={done} />}
      </main>
    </div>
  );
}
