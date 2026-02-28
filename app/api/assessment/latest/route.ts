import { NextResponse } from "next/server";
import { createDynamoClient } from "@/utils/dynamoClient";
import { withAuth } from "@/utils/authServer";

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
  return withAuth(undefined, async (user) => {
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
  });
}
