export type ProfileForRouting = {
  latestAssessmentId: string | null;
  activePracticeIds?: string[] | null;
  todayFocusPracticeId?: string | null;
};

export function decideRoute(
  profile: ProfileForRouting
): "/assessment" | "/results" | "/practices" | "/today" {
  if (!profile.latestAssessmentId) {
    return "/assessment";
  }

  if (!profile.activePracticeIds || profile.activePracticeIds.length === 0) {
    return "/results";
  }

  if (!profile.todayFocusPracticeId) {
    return "/practices";
  }

  return "/today";
}
