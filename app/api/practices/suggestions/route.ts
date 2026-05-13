import { NextResponse } from 'next/server'
import { createDynamoClient } from '@/utils/dynamoClient'
import { withAuth } from '@/utils/authServer'
import { getFallbackSuggestions } from '@/lib/practices/suggestions'
import { practicesById, practicesByPillar, type Practice } from '@/lib/practices/library'
import type { Pillar } from '@/lib/assessment/pillars'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ProfileItem = {
  focusPillar?: string | null
  lowestPillarId?: string | null
  latestAssessmentId?: string | null
}

type AssessmentItem = {
  suggestedPracticeIds?: string[]
  lowestPillarId?: string | null
  focusPillar?: string | null
}

export async function GET() {
  return withAuth(undefined, async (user) => {
    const client = createDynamoClient()
    const pk = `USER#${user.userId}`

    const profile = await client.getItem<ProfileItem>({ PK: pk, SK: 'PROFILE' })
    const profilePillar = ((profile?.lowestPillarId ?? profile?.focusPillar) as Pillar | null) ?? null

    if (profile?.latestAssessmentId) {
      const assessment = await client.getItem<AssessmentItem>({
        PK: pk,
        SK: `ASSESS#${profile.latestAssessmentId}`,
      })

      const suggestedIds = assessment?.suggestedPracticeIds
      if (suggestedIds && suggestedIds.length > 0) {
        const suggestions = suggestedIds
          .map((id) => practicesById.get(id))
          .filter((p): p is Practice => Boolean(p))
        return NextResponse.json(
          { suggestions, focusPillar: profilePillar, lowestPillarId: profilePillar },
          { status: 200 },
        )
      }

      const legacyPillar =
        ((assessment?.lowestPillarId ?? assessment?.focusPillar) as Pillar | null) ?? profilePillar
      if (legacyPillar) {
        const suggestions = (practicesByPillar[legacyPillar] ?? []).slice(0, 3)
        return NextResponse.json(
          { suggestions, focusPillar: legacyPillar, lowestPillarId: legacyPillar },
          { status: 200 },
        )
      }
    }

    return NextResponse.json(
      { suggestions: getFallbackSuggestions(), focusPillar: null, lowestPillarId: null },
      { status: 200 },
    )
  })
}
