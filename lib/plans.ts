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
