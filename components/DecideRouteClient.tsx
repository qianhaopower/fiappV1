"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { decideRoute, type ProfileForRouting } from "@/lib/decideRoute";
import { useProfile } from "@/contexts/ProfileContext";
import FullPageSpinner from "@/components/FullPageSpinner";
import { Button } from "@/components/ui";
import { readLocalResult, clearLocalResult } from "@/lib/assessment/localResult";
import { trackEvent } from "@/lib/analytics";

// After a quiet period the Lambda may need to cold-start. fetchMe retries
// transient failures already (see lib/apiClient.ts); this just lets the
// user know we're still working, instead of staring at a silent spinner.
const SLOW_LOAD_MESSAGE_MS = 6000;

export default function DecideRouteClient() {
  const router = useRouter();
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);
  const { profile, loading, error, refetch } = useProfile();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!loading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), SLOW_LOAD_MESSAGE_MS);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.replace("/auth");
      return;
    }

    if (error?.status === 401 || error?.status === 403) {
      router.replace("/auth");
      return;
    }

    if (loading || !profile) return;

    if (error) return;

    let cancelled = false;
    const profileSnapshot = profile;

    async function go() {
      const stored = readLocalResult();

      // Existing user with stale localStorage from a curious anonymous take.
      // Decision 4 in the plan: preserve server data, silently drop local.
      if (stored && profileSnapshot.latestAssessmentId) {
        clearLocalResult();
      } else if (stored && !profileSnapshot.latestAssessmentId) {
        // Anonymous → signup hydration. Persist their answers as the canonical
        // ASSESS# record via the existing authed POST path. On success, route
        // straight to /results so they see unlocked CTAs (Decision 2).
        try {
          const res = await fetch("/api/assessment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers: stored.answers }),
          });
          if (res.ok) {
            clearLocalResult();
            console.log(JSON.stringify({
              funnel_event: "hydration_success",
              ts: new Date().toISOString(),
              focusPillar: stored.focusPillar,
            }));
            trackEvent("hydration_success", { focus_pillar: stored.focusPillar });
            trackEvent("signup_completed");
            await refetch();
            if (!cancelled) router.replace("/results");
            return;
          }
          console.log(JSON.stringify({
            funnel_event: "hydration_failure",
            ts: new Date().toISOString(),
            status: res.status,
          }));
          trackEvent("hydration_failure", { error_status: res.status });
        } catch {
          console.log(JSON.stringify({
            funnel_event: "hydration_error",
            ts: new Date().toISOString(),
          }));
          trackEvent("hydration_failure", { error_status: -1 });
        }
        // On failure, fall through to default routing. localStorage stays so
        // the user can retry by visiting /results manually.
      }

      const next = decideRoute(profileSnapshot as ProfileForRouting);
      if (!cancelled) router.replace(next);
    }

    go();
    return () => { cancelled = true; };
  }, [authStatus, loading, profile, error, router, refetch]);

  if (authStatus === "unauthenticated") {
    return <FullPageSpinner label="Redirecting..." />;
  }

  if (loading) {
    return (
      <FullPageSpinner
        label={slow ? "Waking the server up — almost there…" : "Loading your profile…"}
      />
    );
  }

  if (error && error.status !== 401 && error.status !== 403) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm max-w-sm">
          <div className="text-base font-semibold text-foreground">
            Something went wrong
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn&apos;t load your profile. Please try again.
          </p>
          <div className="mt-4">
            <Button onClick={refetch}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  return <FullPageSpinner label="Redirecting..." />;
}
