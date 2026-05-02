"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useProfile } from "@/contexts/ProfileContext";
import { Button } from "@/components/ui";

/**
 * Dev-only control to toggle subscriptionStatus for testing paid flows.
 * Renders only when NEXT_PUBLIC_FIAPP_DEV_SUBSCRIPTION=true (e.g. in .env.local).
 */
export function DevSubscriptionToggle() {
  const { refetch } = useProfile();
  const [loading, setLoading] = useState(false);

  if (process.env.NEXT_PUBLIC_FIAPP_DEV_SUBSCRIPTION !== "true") return null;

  async function setStatus(status: "FREE" | "PAID") {
    setLoading(true);
    try {
      const res = await fetch("/api/dev/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subscriptionStatus: status }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("Failed to update", {
          description: data?.error || `HTTP ${res.status}`,
        });
        return;
      }

      await refetch();
      toast.success(`Set to ${status === "PAID" ? "Premium" : "Free"}`);
    } catch (err) {
      toast.error("Failed to update", {
        description: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-1" title="Dev: toggle subscription">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setStatus("FREE")}
        disabled={loading}
        className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
      >
        Free
      </Button>
      <span className="text-muted-foreground/60 text-xs">|</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setStatus("PAID")}
        disabled={loading}
        className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
      >
        Paid
      </Button>
    </div>
  );
}
