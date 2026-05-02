'use client'

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { Pillar } from '@/lib/assessment/pillars'
import { pillarOrder } from '@/lib/assessment/pillars'
import { MOCK_PILLAR_LABELS } from '@/lib/mockState'

const MAX_SCORE = 5

type Props = {
  scores: Record<Pillar, number>
  focusPillar: Pillar
}

export function PillarRadarChart({ scores }: Props) {
  const data = pillarOrder.map((pillar) => ({
    pillar: MOCK_PILLAR_LABELS[pillar],
    score: scores[pillar] ?? 0,
    fullMark: MAX_SCORE,
  }))

  const focusColor = `hsl(var(--primary))`

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis
          dataKey="pillar"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke={focusColor}
          fill={focusColor}
          fillOpacity={0.25}
          strokeWidth={2}
          dot={{ r: 3, fill: focusColor, strokeWidth: 0 }}
        />
        <Tooltip
          formatter={(value) => [`${value} / ${MAX_SCORE}`, 'Score']}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'hsl(var(--foreground))',
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
