"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMe } from "@/lib/apiClient";
import { decideRoute, type ProfileForRouting } from "@/lib/decideRoute";
import FullPageSpinner from "@/components/FullPageSpinner";
import { Button } from "@/components/ui";

type Status = "loading" | "error";

export default function DecideRouteClient() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");

  const run = useCallback(async () => {
    setStatus("loading");

    try {
      const { status: httpStatus, data } = await fetchMe<ProfileForRouting>();

      if (httpStatus === 401 || httpStatus === 403) {
        router.replace("/auth");
        return;
      }

      if (!data?.profile) {
        setStatus("error");
        return;
      }

      const next = decideRoute(data.profile);
      router.replace(next);
    } catch {
      setStatus("error");
    }
  }, [router]);

  useEffect(() => {
    run();
  }, [run]);

  if (status === "loading") {
    return <FullPageSpinner label="Loading..." />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm max-w-sm">
        <div className="text-base font-semibold text-foreground">
          Something went wrong
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn’t load your profile. Please try again.
        </p>
        <div className="mt-4">
          <Button onClick={run}>Retry</Button>
        </div>
      </div>
    </div>
  );
}
