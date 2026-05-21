"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { useCookieConsent } from "@/components/CookieBanner";

/**
 * Loads GA4 only when (a) `NEXT_PUBLIC_GA4_MEASUREMENT_ID` is set and
 * (b) the user has accepted the cookie banner. Decline keeps GA4 entirely off.
 * See docs/operations/analytics-privacy-boundaries.md §Third-party analytics.
 */
export default function GA4Loader() {
  const consent = useCookieConsent();
  const id = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
  if (!id) return null;
  if (consent !== "accepted") return null;
  return <GoogleAnalytics gaId={id} />;
}
