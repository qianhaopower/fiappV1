'use client';

import Link from 'next/link';
import { DashboardPage } from '@/components/layout';
import { StatCard, EmptyState, Card, Button } from '@/components/ui';
import { MOCK_COUNTERS, MOCK_MILESTONES } from '@/lib/mockState';

export default function ProgressPage() {
  return (
    <DashboardPage
      title="Progress"
      description="Your growth at a glance."
      metaLabel="INSIGHTS"
      summary={
        <div className="space-y-4">
          <StatCard
            label="Total check-ins"
            value={MOCK_COUNTERS.totalReturns}
            helper="across all practices"
          />
          <StatCard
            label="Current streak"
            value={`${MOCK_COUNTERS.currentStreak}d`}
            helper="days in a row"
          />
          <StatCard
            label="Longest streak"
            value={`${MOCK_COUNTERS.longestStreak}d`}
            helper="personal best"
          />
          <StatCard
            label="Practices started"
            value={MOCK_COUNTERS.practicesActivated}
            helper="total over all time"
          />
        </div>
      }
      main={
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Milestones</p>
          {MOCK_MILESTONES.length === 0 ? (
            <EmptyState
              title="No milestones yet"
              text="Keep checking in — your first milestone is closer than you think."
            />
          ) : (
            <div className="space-y-3">
              {MOCK_MILESTONES.map((m) => (
                <Card key={m.id} variant="subtle" className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    ★
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{m.title}</p>
                    <p className="text-sm text-muted-foreground">{m.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{m.achievedAt}</p>
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
