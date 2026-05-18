"use client";

import { useRouter } from "next/navigation";
import { pillarOrder, pillarLabels, type Pillar } from "@/lib/assessment/pillars";
import { pillarColors } from "@/lib/design/pillarColors";
import { PillarRadarChart } from "@/components/ui/PillarRadarChart";
import { Button } from "@/components/ui";

const SAMPLE_SCORES: Record<Pillar, number> = {
  financial: 2,
  relationship: 4,
  information: 3,
  emotional: 3,
  nutrition: 4,
  dynamic: 2,
  sleep: 3,
};

// #419 escape hatch — some users got stuck on /onboarding when router.replace
// silently failed to change the URL (browser/router state we couldn't repro).
// If we're still on /onboarding NAV_FALLBACK_MS after the click, force a full
// page navigation so the user is never trapped. The console.warn leaves a
// breadcrumb the next time someone reports being stuck.
const NAV_FALLBACK_MS = 600;

export default function OnboardingPage() {
  const router = useRouter();

  function start() {
    if (typeof window !== "undefined") {
      console.info("[onboarding] start: navigating to /assessment");
    }
    router.replace("/assessment");
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        if (window.location.pathname.startsWith("/onboarding")) {
          console.warn(
            "[onboarding] router.replace did not change URL after",
            NAV_FALLBACK_MS,
            "ms — falling back to window.location"
          );
          window.location.href = "/assessment";
        }
      }, NAV_FALLBACK_MS);
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <header className="border-b border-border px-6">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between">
          <span className="text-sm font-semibold text-foreground">
            Friends Intelligence
          </span>
          <button
            onClick={start}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip intro →
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 py-8 sm:py-12">
        <div className="space-y-5 sm:space-y-8">
          <div className="space-y-4">
            <p className="text-xs tracking-[0.12em] uppercase text-muted-foreground">
              Welcome
            </p>
            <h1 className="text-2xl font-semibold text-foreground leading-snug">
              7 areas of your life
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Friends Intelligence is a framework for building the habits that matter most across seven areas of a well-lived life. You&apos;ll get a quick snapshot of how each area feels today — and we&apos;ll pick one to focus on first.
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

          <div className="rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
            <div className="mx-auto max-w-[280px] sm:max-w-none">
              <PillarRadarChart scores={SAMPLE_SCORES} focusPillar="financial" />
            </div>
            <p className="mt-1 text-center text-xs text-muted-foreground">Sample results</p>
          </div>

          <Button className="w-full" onClick={start}>
            Take your first assessment →
          </Button>
        </div>
      </main>
    </div>
  );
}
