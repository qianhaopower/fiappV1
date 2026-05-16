import type { MilestoneIcon, MilestoneTier } from '@/lib/milestones/milestones'

type Props = {
  icon: MilestoneIcon
  tier: MilestoneTier
  achieved?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const tierStyles: Record<MilestoneTier, { achieved: string; pending: string }> = {
  bronze: {
    achieved: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
    pending:  'bg-amber-50 text-amber-400 ring-1 ring-amber-100',
  },
  silver: {
    achieved: 'bg-slate-200 text-slate-700 ring-1 ring-slate-300',
    pending:  'bg-slate-100 text-slate-400 ring-1 ring-slate-200',
  },
  gold: {
    achieved: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300',
    pending:  'bg-yellow-50 text-yellow-400 ring-1 ring-yellow-200',
  },
}

const sizeMap = {
  sm: { box: 'h-8 w-8', stroke: 16 },
  md: { box: 'h-10 w-10', stroke: 20 },
}

export function MilestoneBadge({ icon, tier, achieved = true, size = 'md', className }: Props) {
  const tone = tierStyles[tier][achieved ? 'achieved' : 'pending']
  const { box, stroke } = sizeMap[size]

  return (
    <div
      aria-hidden="true"
      className={`${box} rounded-full flex items-center justify-center shrink-0 ${tone} ${className ?? ''}`}
    >
      <IconGlyph icon={icon} size={stroke} />
    </div>
  )
}

function IconGlyph({ icon, size }: { icon: MilestoneIcon; size: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (icon) {
    case 'sprout':
      return (
        <svg {...common}>
          <path d="M7 20h10" />
          <path d="M10 20c5.5-2.5.8-6.4 3-10" />
          <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
          <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common}>
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M16 2v4" />
          <path d="M8 2v4" />
          <path d="M3 10h18" />
        </svg>
      )
    case 'flame':
      return (
        <svg {...common}>
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      )
    case 'trophy':
      return (
        <svg {...common}>
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      )
    case 'medal':
      return (
        <svg {...common}>
          <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15" />
          <path d="M11 12 5.12 2.2" />
          <path d="m13 12 5.88-9.8" />
          <path d="M8 7h8" />
          <circle cx="12" cy="17" r="5" />
          <path d="M11 17l1 1 2-2" />
        </svg>
      )
  }
}
