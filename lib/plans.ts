export type SubscriptionStatus = "FREE" | "PAID";

export function isPlusPlan(status?: string | null): boolean {
  return status?.toUpperCase() === "PAID";
}

export function getPlanLabel(status?: string | null): string {
  return isPlusPlan(status) ? "Plus plan" : "Free plan";
}

export function getPlanShortLabel(status?: string | null): string {
  return isPlusPlan(status) ? "Plus" : "Free";
}

export const PLUS_PLAN_TAGLINE = "Track up to 10 active practices instead of 1.";

export const PLUS_PLAN_DESCRIPTION =
  "Plus unlocks up to 10 active practices at once (Free is limited to 1), so you can build habits across multiple pillars in parallel.";
