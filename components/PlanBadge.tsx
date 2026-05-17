"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useProfile } from "@/contexts/ProfileContext";
import { getPlanLabel, isPlusPlan } from "@/lib/plans";

export function PlanBadge() {
  const { profile, loading } = useProfile();
  const [busy, setBusy] = useState(false);

  if (loading || !profile?.subscriptionStatus) return null;

  const plan = profile.subscriptionStatus;
  const label = getPlanLabel(plan);
  const isPlus = isPlusPlan(plan);

  const baseClass =
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  const colorClass = isPlus
    ? "bg-primary/15 text-primary"
    : "bg-muted text-muted-foreground";

  if (isPlus) {
    return (
      <span className={`${baseClass} ${colorClass}`} aria-label={`Plan: ${label}`}>
        {label}
      </span>
    );
  }

  async function handleClick() {
    setBusy(true);
    try {
      const res = await fetch("/api/payment/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      toast.error("Could not start checkout. Please try again.");
    } catch {
      toast.error("Could not start checkout. Please try again.");
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label={`Plan: ${label}. Upgrade to Plus.`}
      className={`${baseClass} ${colorClass} cursor-pointer transition-colors hover:bg-primary/15 hover:text-primary disabled:opacity-60`}
    >
      {busy ? "Loading…" : label}
    </button>
  );
}
