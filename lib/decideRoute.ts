export type ProfileForRouting = {
  latestAssessmentId: string | null;
  activePracticeIds?: string[] | null;
  activeTrialCount?: number | null;
  todayFocusPracticeId?: string | null;
};

export function decideRoute(
  profile: ProfileForRouting
): "/onboarding" | "/assessment" | "/results" | "/practices" | "/today" {
  if (!profile.latestAssessmentId) {
    return "/onboarding";
  }

  const hasActivePractices = (profile.activePracticeIds?.length ?? 0) > 0;
  const hasActiveTrials = (profile.activeTrialCount ?? 0) > 0;

  if (!hasActivePractices && !hasActiveTrials) {
    return "/results";
  }

  if (!profile.todayFocusPracticeId) {
    return "/practices";
  }

  return "/today";
}
