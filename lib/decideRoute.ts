export type ProfileForRouting = {
  latestAssessmentId: string | null;
};

export function decideRoute(
  profile: ProfileForRouting
): "/onboarding" | "/today" {
  if (!profile.latestAssessmentId) {
    return "/onboarding";
  }
  return "/today";
}
