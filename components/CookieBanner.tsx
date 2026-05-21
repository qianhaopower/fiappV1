"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui";

const KEY = "cookie_consent";
const EVENT = "fiapp:cookie-consent";

export type ConsentState = "accepted" | "declined" | null;

function read(): ConsentState {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "accepted" || v === "declined" ? v : null;
  } catch {
    return null;
  }
}

function write(v: "accepted" | "declined") {
  try {
    window.localStorage.setItem(KEY, v);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // ignore
  }
}

/**
 * Read-only hook returning current consent state. Re-renders when a banner
 * decision is made anywhere in the app (via the fiapp:cookie-consent event).
 */
export function useCookieConsent(): ConsentState {
  // Default to `null` on the server so SSR doesn't ship an accepted/declined
  // assumption that mismatches the client's first paint.
  const [state, setState] = useState<ConsentState>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(read());
    setHydrated(true);
    function onChange() {
      setState(read());
    }
    window.addEventListener(EVENT, onChange);
    // Cross-tab updates: storage events fire for other tabs.
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return hydrated ? state : null;
}

export default function CookieBanner() {
  const consent = useCookieConsent();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const accept = useCallback(() => write("accepted"), []);
  const decline = useCallback(() => write("declined"), []);

  // Don't render anything until we've hydrated localStorage on the client —
  // avoids a flash on every page load.
  if (!mounted) return null;
  if (consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-card/95 backdrop-blur px-4 py-3 shadow-lg sm:px-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground">
          We use a single analytics cookie to understand how the assessment is
          used. No personal data is shared.{" "}
          <a
            href="/privacy"
            className="underline underline-offset-2 hover:text-primary"
          >
            Learn more
          </a>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={decline}>
            Decline
          </Button>
          <Button size="sm" onClick={accept}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
