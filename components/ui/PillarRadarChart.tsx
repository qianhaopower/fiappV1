'use client'

import { useMemo, useState } from 'react'
import { pillarOrder, pillarLabels } from '@/lib/assessment/pillars'
import { pillarColors } from '@/lib/design/pillarColors'
import type { Pillar } from '@/lib/assessment/pillars'

const MAX_SCORE = 5
const N = pillarOrder.length // 7
const W = 500
const H = 420
const CX = W / 2       // 250
const CY = H / 2 - 8  // 202 — a touch high to balance label space below
const R = 138          // outermost ring radius
const LABEL_R = R + 32 // label anchor distance from center

function angle(i: number) {
  // start at top (-90°), go clockwise
  return (2 * Math.PI * i / N) - Math.PI / 2
}

function pt(r: number, i: number): [number, number] {
  const a = angle(i)
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)]
}

function scorePoints(scores: Record<Pillar, number>): string {
  return pillarOrder
    .map((p, i) => pt(((scores[p] ?? 0) / MAX_SCORE) * R, i).join(','))
    .join(' ')
}

function textAnchor(i: number): 'start' | 'middle' | 'end' {
  const c = Math.cos(angle(i))
  return c > 0.15 ? 'start' : c < -0.15 ? 'end' : 'middle'
}

type Props = {
  scores: Record<Pillar, number>
  focusPillar: Pillar
}

export function PillarRadarChart({ scores, focusPillar }: Props) {
  const [hovered, setHovered] = useState<Pillar | null>(null)

  const polygon = useMemo(() => scorePoints(scores), [scores])

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full select-none"
      style={{ maxHeight: 360, fontFamily: 'inherit' }}
    >
      {/* Concentric circular grid rings */}
      {[1, 2, 3, 4, 5].map((lvl) => (
        <circle
          key={lvl}
          cx={CX} cy={CY}
          r={(lvl / MAX_SCORE) * R}
          fill="none"
          style={{ stroke: 'var(--border)' }}
          strokeOpacity={lvl === 5 ? 0.5 : 0.22}
          strokeWidth={lvl === 5 ? 1.5 : 1}
        />
      ))}

      {/* Outermost ring — subtle background tint */}
      <circle
        cx={CX} cy={CY} r={R}
        style={{ fill: 'var(--muted)' }}
        fillOpacity={0.12}
        stroke="none"
      />

      {/* Axis spokes */}
      {pillarOrder.map((_, i) => {
        const [x, y] = pt(R, i)
        return (
          <line
            key={i}
            x1={CX} y1={CY} x2={x} y2={y}
            style={{ stroke: 'var(--border)' }}
            strokeOpacity={0.25}
            strokeWidth={1}
          />
        )
      })}

      {/* Score polygon — fill */}
      <polygon
        points={polygon}
        style={{ fill: 'var(--primary)' }}
        fillOpacity={0.1}
        stroke="none"
      />

      {/* Score polygon — stroke (separate so fill opacity doesn't affect it) */}
      <polygon
        points={polygon}
        fill="none"
        style={{ stroke: 'var(--primary)' }}
        strokeOpacity={0.85}
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Vertex dots */}
      {pillarOrder.map((pillar, i) => {
        const score = scores[pillar] ?? 0
        const r = (score / MAX_SCORE) * R
        const [x, y] = pt(r, i)
        const isFocus = pillar === focusPillar
        const isHov = pillar === hovered
        const color = pillarColors[pillar]

        return (
          <g
            key={pillar}
            onMouseEnter={() => setHovered(pillar)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'default' }}
          >
            {/* Halo for focus pillar or hover */}
            {(isFocus || isHov) && (
              <circle
                cx={x} cy={y}
                r={isHov ? 13 : 11}
                fill={color}
                fillOpacity={isHov ? 0.2 : 0.14}
                stroke="none"
              />
            )}
            {/* Dot */}
            <circle
              cx={x} cy={y}
              r={isFocus ? 6 : 5}
              fill={color}
              stroke="white"
              strokeWidth={1.5}
            />
          </g>
        )
      })}

      {/* Labels */}
      {pillarOrder.map((pillar, i) => {
        const [lx, ly] = pt(LABEL_R, i)
        const anchor = textAnchor(i)
        const isFocus = pillar === focusPillar

        return (
          <text
            key={pillar}
            x={lx}
            y={ly}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize={14}
            fontWeight={isFocus ? 600 : 400}
            style={{
              fill: isFocus ? pillarColors[pillar] : 'var(--foreground)',
              fillOpacity: isFocus ? 0.9 : 0.6,
            }}
          >
            {pillarLabels[pillar]}
          </text>
        )
      })}
    </svg>
  )
}
