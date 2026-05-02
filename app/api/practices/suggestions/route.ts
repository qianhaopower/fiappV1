import { NextResponse } from 'next/server'
import { createDynamoClient } from '@/utils/dynamoClient'
import { withAuth } from '@/utils/authServer'
import { getSuggestions } from '@/lib/practices/suggestions'
import type { Pillar } from '@/lib/assessment/pillars'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ProfileItem = {
  focusPillar?: string | null
}

export async function GET() {
  return withAuth(undefined, async (user) => {
    const client = createDynamoClient()
    const profile = await client.getItem<ProfileItem>({
      PK: `USER#${user.userId}`,
      SK: 'PROFILE',
    })

    const focusPillar = (profile?.focusPillar as Pillar | null) ?? null
    const suggestions = getSuggestions(focusPillar)

    return NextResponse.json({ suggestions, focusPillar }, { status: 200 })
  })
}
