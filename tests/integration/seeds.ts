import { createDynamoClient, createReturnsClient } from "@/utils/dynamoClient";
import { makeUPracticeSK, makeTrialSK, TRIAL_DURATION_DAYS } from "@/lib/practices/trial";
import { makeMilestoneSK } from "@/lib/milestones/milestones";
import { makeReturnPK, makeReturnSK } from "@/lib/returns/returns";
import { practicesById } from "@/lib/practices/library";

type ProfileOverrides = {
  subscriptionStatus?: string;
  activePracticeIds?: string[];
  activePracticeSkById?: Record<string, string>;
  latestAssessmentId?: string | null;
  focusPillar?: string | null;
  returnCounters?: Record<string, number>;
  todayFocusPracticeId?: string | null;
  timezone?: string;
  dayResetTime?: number;
};

export async function seedProfile(userId: string, overrides: ProfileOverrides = {}) {
  const client = createDynamoClient();
  const now = new Date().toISOString();
  await client.putItem({
    PK: `USER#${userId}`,
    SK: "PROFILE",
    userId,
    subscriptionStatus: "FREE",
    activePracticeIds: [],
    activePracticeSkById: {},
    todayFocusPracticeId: null,
    latestAssessmentId: null,
    focusPillar: null,
    returnCounters: {},
    practiceCounters: {},
    milestonesAchieved: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

export async function seedActivePractice(userId: string, practiceId: string) {
  const client = createDynamoClient();
  const pk = `USER#${userId}`;
  const sk = makeUPracticeSK(practiceId);
  const practice = practicesById.get(practiceId);
  if (!practice) throw new Error(`Practice not found: ${practiceId}`);
  const now = new Date().toISOString();

  const profile = await client.getItem<{
    activePracticeIds?: string[];
    activePracticeSkById?: Record<string, string>;
  }>({ PK: pk, SK: "PROFILE" });

  const ids = [...(profile?.activePracticeIds ?? []), practiceId];
  const skById = { ...(profile?.activePracticeSkById ?? {}), [practiceId]: sk };

  await Promise.all([
    client.putItem({ PK: pk, SK: sk, practiceId, pillar: practice.pillar, addedAt: now, status: "active" }),
    client.updateItem({
      Key: { PK: pk, SK: "PROFILE" },
      UpdateExpression: "SET activePracticeIds = :ids, activePracticeSkById = :skById",
      ExpressionAttributeValues: { ":ids": ids, ":skById": skById },
    }),
  ]);
}

export async function seedTrial(
  userId: string,
  practiceId: string,
  overrides: { status?: string; expiresAt?: string } = {}
) {
  const client = createDynamoClient();
  const pk = `USER#${userId}`;
  const startedAt = new Date().toISOString();
  const expiresAt =
    overrides.expiresAt ??
    new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const practice = practicesById.get(practiceId);
  if (!practice) throw new Error(`Practice not found: ${practiceId}`);

  await client.putItem({
    PK: pk,
    SK: makeTrialSK(startedAt, practiceId),
    practiceId,
    pillar: practice.pillar,
    startedAt,
    status: overrides.status ?? "trial",
    expiresAt,
  });
}

export async function seedReturn(
  userId: string,
  practiceId: string,
  date: string,
  didIt: boolean
) {
  const client = createReturnsClient();
  const now = new Date().toISOString();
  await client.putItem({
    PK: makeReturnPK(userId, practiceId),
    SK: makeReturnSK(date),
    didIt,
    createdAt: now,
    updatedAt: now,
  });
}

export async function seedMilestone(
  userId: string,
  type: "total" | "practice",
  threshold: number,
  practiceId?: string
) {
  const client = createDynamoClient();
  await client.putItem({
    PK: `USER#${userId}`,
    SK: makeMilestoneSK(type, threshold, practiceId),
    type,
    threshold,
    ...(practiceId ? { practiceId } : {}),
    title: `Milestone ${threshold}`,
    description: `Achieved ${threshold}`,
    achievedAt: new Date().toISOString(),
  });
}

export async function seedAssessment(
  userId: string,
  assessmentId: string,
  overrides: {
    focusPillar?: string;
    lowestPillarId?: string;
    scoresByPillar?: Record<string, number>;
    suggestedPracticeIds?: string[];
  } = {}
) {
  const client = createDynamoClient();
  const pk = `USER#${userId}`;
  const focusPillar = overrides.focusPillar ?? "sleep";
  const lowestPillarId = overrides.lowestPillarId ?? focusPillar;
  const scoresByPillar = overrides.scoresByPillar ?? {
    financial: 3, relationship: 3, information: 3,
    emotional: 3, nutrition: 3, dynamic: 3, sleep: 1,
  };

  await client.putItem({
    PK: pk,
    SK: `ASSESS#${assessmentId}`,
    assessmentId,
    focusPillar,
    lowestPillarId,
    scoresByPillar,
    totalScore: Object.values(scoresByPillar).reduce((a, b) => a + b, 0),
    createdAt: new Date().toISOString(),
    ...(overrides.suggestedPracticeIds
      ? { suggestedPracticeIds: overrides.suggestedPracticeIds }
      : {}),
  });

  await client.updateItem({
    Key: { PK: pk, SK: "PROFILE" },
    UpdateExpression: "SET latestAssessmentId = :id, focusPillar = :fp, lowestPillarId = :lp",
    ExpressionAttributeValues: {
      ":id": assessmentId,
      ":fp": focusPillar,
      ":lp": lowestPillarId,
    },
  });
}
