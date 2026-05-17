"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useProfile } from "@/contexts/ProfileContext";
import { Button } from "@/components/ui";

export function UpgradeButton() {
  const { profile, loading } = useProfile();
  const [busy, setBusy] = useState(false);

  if (loading || profile?.subscriptionStatus !== "FREE") return null;

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
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={handleClick}
      className="border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50"
    >
      {busy ? "Loading…" : "Upgrade to Plus"}
    </Button>
  );
}
