"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { decideRoute, type ProfileForRouting } from "@/lib/decideRoute";
import { useProfile } from "@/contexts/ProfileContext";
import FullPageSpinner from "@/components/FullPageSpinner";
import { Button } from "@/components/ui";

export default function DecideRouteClient() {
  const router = useRouter();
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);
  const { profile, loading, error, refetch } = useProfile();

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

    const next = decideRoute(profile as ProfileForRouting);
    router.replace(next);
  }, [authStatus, loading, profile, error, router]);

  if (authStatus === "unauthenticated") {
    return <FullPageSpinner label="Redirecting..." />;
  }

  if (loading) {
    return <FullPageSpinner label="Loading your profile…" />;
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
