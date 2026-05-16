'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardPage } from '@/components/layout';
import { StatCard, EmptyState, Card, Button, Loading, ErrorState } from '@/components/ui';
import { MilestoneBadge } from '@/components/MilestoneBadge';
import type { MilestoneIcon, MilestoneTier } from '@/lib/milestones/milestones';

type Milestone = {
  sk: string
  type: string
  threshold: number
  practiceId?: string
  title: string
  description: string
  achievedAt: string
  icon?: MilestoneIcon
  tier?: MilestoneTier
}

type NextMilestone = {
  type: string
  threshold: number
  practiceId?: string
  practiceTitle?: string
  title: string
  description: string
  progress: number
  remaining: number
  icon: MilestoneIcon
  tier: MilestoneTier
}

type ProgressData = {
  totalReturns: number
  practicesActivated: number
  currentStreak: number
  longestStreak: number
  nextMilestones: NextMilestone[]
  milestones: Milestone[]
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/progress')
      .then((res) => {
        if (!res.ok) throw new Error('Failed')
        return res.json() as Promise<ProgressData>
      })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardPage
      title="Progress"
      description="Your growth at a glance."
      summary={
        loading ? (
          <Loading text="Loading stats…" />
        ) : error ? (
          <ErrorState message="Couldn't load stats." onRetry={() => window.location.reload()} />
        ) : (
          <div className="space-y-4">
            <StatCard
              label="Total check-ins"
              value={data?.totalReturns ?? 0}
              helper="across all practices"
            />
            <StatCard
              label="Current streak"
              value={`${data?.currentStreak ?? 0}d`}
              helper="days in a row"
            />
            <StatCard
              label="Longest streak"
              value={`${data?.longestStreak ?? 0}d`}
              helper="personal best"
            />
            <StatCard
              label="Practices started"
              value={data?.practicesActivated ?? 0}
              helper="total over all time"
            />
          </div>
        )
      }
      main={
        <div className="space-y-6">
          {/* Next-up milestones */}
          {!loading && !error && data && data.nextMilestones.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Coming up</p>
              {data.nextMilestones.map((m) => {
                const pct = Math.min(100, Math.round((m.progress / m.threshold) * 100))
                return (
                  <Card key={`${m.type}-${m.threshold}-${m.practiceId ?? ''}`} variant="subtle">
                    <div className="flex items-start gap-3">
                      <MilestoneBadge icon={m.icon} tier={m.tier} achieved={false} size="sm" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-foreground text-sm">
                            {m.practiceTitle ?? m.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{m.progress}/{m.threshold}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {m.practiceTitle ? `${m.title} — ${m.description}` : m.description}
                        </p>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-1.5 rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{m.remaining} more to go</p>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Milestones</p>
          {loading ? (
            <Loading text="Loading milestones…" />
          ) : error ? null : !data || data.milestones.length === 0 ? (
            <EmptyState
              title="No milestones yet"
              text="Keep checking in — your first milestone is closer than you think."
            />
          ) : (
            <div className="space-y-3">
              {data.milestones.map((m) => (
                <Card key={m.sk} variant="subtle" className="flex items-start gap-4">
                  {m.icon && m.tier ? (
                    <MilestoneBadge icon={m.icon} tier={m.tier} achieved size="md" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-foreground">{m.title}</p>
                    <p className="text-sm text-muted-foreground">{m.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(m.achievedAt).toLocaleDateString()}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="pt-4">
            <Button asChild variant="outline">
              <Link href="/today">← Back to Today</Link>
            </Button>
          </div>
        </div>
      }
    />
  );
}
