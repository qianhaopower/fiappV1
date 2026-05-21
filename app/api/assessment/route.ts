import { NextResponse } from "next/server";
import crypto from "crypto";

import { createDynamoClient } from "@/utils/dynamoClient";
import {
  assessmentQuestionIds,
  assessmentQuestionsById,
} from "@/lib/assessment/questions";
import { computeScores, pickFocusPillar } from "../../../lib/assessment/scoring";
import { getSuggestedPractices } from "@/lib/practices/suggestions";
import { withOptionalAuth } from "@/utils/authServer";
import { trackEvent, trackPillarFocus } from "@/utils/metricsClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withOptionalAuth(req, async ({ user }) => {
    const body = (await req.json()) as {
      answers?: Record<string, boolean>;
    };

    if (!body?.answers || typeof body.answers !== "object") {
      return NextResponse.json(
        { error: "Invalid answers" },
        { status: 400 }
      );
    }

    const answerEntries = Object.entries(body.answers);
    if (answerEntries.length !== assessmentQuestionIds.size) {
      return NextResponse.json(
        { error: "All questions must be answered" },
        { status: 400 }
      );
    }

    for (const [id, value] of answerEntries) {
      if (!assessmentQuestionIds.has(id) || typeof value !== "boolean") {
        return NextResponse.json(
          { error: "Invalid answers" },
          { status: 400 }
        );
      }
    }

    const { scoresByPillar, totalScore } = computeScores(body.answers);
    const focusPillar = pickFocusPillar(scoresByPillar);
    const lowestPillarId = focusPillar;
    const suggestedPracticeIds = getSuggestedPractices(body.answers, lowestPillarId).map(
      (p) => p.id,
    );

    // Structured funnel log line. Authed and anonymous both fire; queryable in
    // CloudWatch Logs Insights as `funnel_event in [...]`. Intentionally
    // anonymous — no userId, no answers (see analytics-privacy-boundaries.md).
    console.log(JSON.stringify({
      funnel_event: user ? 'assessment_submitted_authed' : 'assessment_submitted_anonymous',
      ts: new Date().toISOString(),
      focusPillar,
    }));

    if (!user) {
      // Anonymous: compute-only response. No DynamoDB writes against any USER#
      // PK (no userId to key against). One aggregate counter is incremented so
      // the launch dashboard can count anonymous starts. See plan
      // _docs/plans/anonymous-assessment-funnel.md and the updated
      // analytics-privacy-boundaries.md.
      trackEvent('totalAnonymousAssessments', 'anonymousAssessments');
      return NextResponse.json(
        { focusPillar, lowestPillarId, scoresByPillar, suggestedPracticeIds },
        { status: 200 }
      );
    }

    const assessmentId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const client = createDynamoClient();
    const pk = `USER#${user.userId}`;

    await client.putItem({
      PK: pk,
      SK: `ASSESS#${assessmentId}`,
      assessmentId,
      createdAt,
      scoresByPillar,
      focusPillar,
      lowestPillarId,
      totalScore,
      suggestedPracticeIds,
    });

    const answerWrites = assessmentQuestionsById;
    for (const [questionId, question] of answerWrites) {
      await client.putItem({
        PK: pk,
        SK: `ANS#${assessmentId}#${questionId}`,
        assessmentId,
        questionId,
        pillar: question.pillar,
        answer: body.answers[questionId],
      });
    }

    await client.updateItem({
      Key: { PK: pk, SK: "PROFILE" },
      UpdateExpression:
        "SET latestAssessmentId = :assessmentId, focusPillar = :focusPillar, lowestPillarId = :lowestPillarId",
      ExpressionAttributeValues: {
        ":assessmentId": assessmentId,
        ":focusPillar": focusPillar,
        ":lowestPillarId": lowestPillarId,
      },
    });

    trackEvent('totalAssessments', 'assessments')
    trackPillarFocus(focusPillar)

    return NextResponse.json(
      { assessmentId, focusPillar, lowestPillarId, scoresByPillar, suggestedPracticeIds },
      { status: 200 }
    );
  });
}
