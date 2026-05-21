// Client-side GA4 event helper. Fire-and-forget — never throws, never
// blocks, and silently no-ops when consent has not been granted or GA4
// hasn't loaded. See docs/operations/analytics-privacy-boundaries.md for
// the strict rules on what may and may not be sent as event params.

type Primitive = string | number | boolean;
export type EventParams = Record<string, Primitive | undefined>;

type GtagFn = (
  command: "event",
  name: string,
  params?: EventParams,
) => void;

function isConsented(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("cookie_consent") === "accepted";
  } catch {
    return false;
  }
}

function getGtag(): GtagFn | null {
  if (typeof window === "undefined") return null;
  const g = (window as unknown as { gtag?: GtagFn }).gtag;
  return typeof g === "function" ? g : null;
}

/**
 * Send a GA4 custom event. Hard rules:
 * - Caller must NOT pass user IDs, emails, raw answers, or any PII.
 * - Caller may pass `is_anonymous`, `focus_pillar`, and counts/statuses.
 */
export function trackEvent(name: string, params?: EventParams): void {
  const gtag = getGtag();
  if (!gtag) return;
  if (!isConsented()) return;
  try {
    gtag("event", name, params ?? {});
  } catch {
    // ignore
  }
}
