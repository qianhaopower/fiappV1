import { describe, it, expect } from 'vitest'
import { practices } from '@/lib/practices/library'
import { RETIRED_PRACTICE_IDS } from '@/lib/practices/retired-ids'

describe('retired practice IDs', () => {
  // The hazard this test guards against: reusing a retired practice ID would
  // resurrect every UPRACTICE# row, RETURN# row, and milestone tied to it in
  // existing users' DynamoDB data — silently, with no UI warning. See
  // lib/practices/retired-ids.ts for the full rationale.
  it('no current practice ID is in the retired registry', () => {
    const collisions = practices
      .map((p) => p.id)
      .filter((id) => RETIRED_PRACTICE_IDS.has(id))
    expect(
      collisions,
      `These practice IDs were previously retired and must not be reused: ${collisions.join(
        ', ',
      )}. Pick a different id, or — only if you are absolutely sure no production user ever had data under this id — remove it from RETIRED_PRACTICE_IDS in lib/practices/retired-ids.ts.`,
    ).toEqual([])
  })

  it('retired registry contains no duplicates with current library (sanity)', () => {
    const currentIds = new Set(practices.map((p) => p.id))
    for (const retiredId of RETIRED_PRACTICE_IDS) {
      expect(currentIds.has(retiredId)).toBe(false)
    }
  })
})
