import { NextResponse } from "next/server";
import crypto from "crypto";

import { createDynamoClient } from "@/utils/dynamoClient";
import {
  assessmentQuestionIds,
  assessmentQuestionsById,
} from "@/lib/assessment/questions";
import { computeScores, pickFocusPillar } from "../../../lib/assessment/scoring";
import { withAuth } from "@/utils/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withAuth(req, async (user) => {
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

    const assessmentId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const { scoresByPillar, totalScore } = computeScores(body.answers);
    const focusPillar = pickFocusPillar(scoresByPillar);

    const client = createDynamoClient();
    const pk = `USER#${user.userId}`;

    await client.putItem({
      PK: pk,
      SK: `ASSESS#${assessmentId}`,
      assessmentId,
      createdAt,
      scoresByPillar,
      focusPillar,
      totalScore,
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
        "SET latestAssessmentId = :assessmentId, focusPillar = :focusPillar",
      ExpressionAttributeValues: {
        ":assessmentId": assessmentId,
        ":focusPillar": focusPillar,
      },
    });

    return NextResponse.json(
      { assessmentId, focusPillar, scoresByPillar },
      { status: 200 }
    );
  });
}
