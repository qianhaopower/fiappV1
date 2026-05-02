import type { Pillar } from '@/lib/assessment/pillars'
import { type Practice, practicesByPillar } from './library'

// Shown when user has no assessment yet — one from each starter pillar
const FALLBACK_PILLARS: Pillar[] = ['sleep', 'emotional', 'financial']

export function getSuggestions(focusPillar?: Pillar | null): Practice[] {
  if (focusPillar) {
    return (practicesByPillar[focusPillar] ?? []).slice(0, 3)
  }
  return FALLBACK_PILLARS.map((p) => practicesByPillar[p][0]).filter(Boolean)
}
