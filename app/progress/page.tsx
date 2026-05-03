'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardPage } from '@/components/layout';
import { StatCard, EmptyState, Card, Button, Loading, ErrorState } from '@/components/ui';

type Milestone = {
  sk: string
  type: string
  threshold: number
  practiceId?: string
  title: string
  description: string
  achievedAt: string
}

type ProgressData = {
  totalReturns: number
  practicesActivated: number
  currentStreak: number
  longestStreak: number
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
      metaLabel="INSIGHTS"
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
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    ★
                  </div>
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
