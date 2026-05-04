"use client";

import { useProfile } from "@/contexts/ProfileContext";
import { getPlanLabel, isPlusPlan } from "@/lib/plans";

export function PlanBadge() {
  const { profile, loading } = useProfile();

  if (loading || !profile?.subscriptionStatus) return null;

  const plan = profile.subscriptionStatus;
  const label = getPlanLabel(plan);
  const variant = isPlusPlan(plan) ? "primary" : "muted";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        variant === "primary"
          ? "bg-primary/15 text-primary"
          : "bg-muted text-muted-foreground"
      }`}
      aria-label={`Plan: ${label}`}
    >
      {label}
    </span>
  );
}
