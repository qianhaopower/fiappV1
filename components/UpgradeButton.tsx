"use client";

import { toast } from "sonner";
import { useProfile } from "@/contexts/ProfileContext";
import { Button } from "@/components/ui";

/**
 * Upgrade CTA shown only for Free plan users.
 * Stubbed: no payments yet; shows toast on click.
 */
export function UpgradeButton() {
  const { profile, loading } = useProfile();

  if (loading || profile?.subscriptionStatus !== "FREE") return null;

  function handleClick() {
    toast.info("Plus plan is coming soon", {
      description: "Plus lets you keep up to 10 active practices.",
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className="border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50"
    >
      Upgrade to Plus
    </Button>
  );
}
