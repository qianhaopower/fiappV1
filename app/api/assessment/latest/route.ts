import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";
import { getCurrentUser } from "aws-amplify/auth/server";
import { createDynamoClient } from "@/utils/dynamoClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfileItem = {
  latestAssessmentId?: string | null;
};

type AssessmentItem = {
  assessmentId: string;
  createdAt: string;
  scoresByPillar: Record<string, number>;
  focusPillar: string;
  totalScore?: number;
};

export async function GET() {
  try {
    const { user } = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        const u = await getCurrentUser(contextSpec);
        return { user: { userId: u.userId, username: u.username } };
      },
    });

    const client = createDynamoClient();
    const pk = `USER#${user.userId}`;
    const profile = await client.getItem<ProfileItem>({
      PK: pk,
      SK: "PROFILE",
    });

    if (!profile?.latestAssessmentId) {
      return NextResponse.json(
        { message: "No assessment" },
        { status: 404 }
      );
    }

    const assessment = await client.getItem<AssessmentItem>({
      PK: pk,
      SK: `ASSESS#${profile.latestAssessmentId}`,
    });

    if (!assessment) {
      return NextResponse.json(
        { message: "No assessment" },
        { status: 404 }
      );
    }

    return NextResponse.json(assessment, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
