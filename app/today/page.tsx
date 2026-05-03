'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { NarrowFormPage } from '@/components/layout';
import { Card, Button, Loading, ErrorState } from '@/components/ui';
import { pillarColors } from '@/lib/design/pillarColors';
import { pillarLabels } from '@/lib/assessment/pillars';
import { practicesById } from '@/lib/practices/library';
import { todayUTC } from '@/lib/returns/returns';
import type { Practice } from '@/lib/practices/library';
import type { DotEntry } from '@/lib/returns/returns';
import type { NewMilestone } from '@/lib/milestones/milestones';

type ActiveData = {
  todayFocusPracticeId: string | null
}

type ReturnsData = {
  returns: DotEntry[]
}

type ReturnResponse = {
  ok: boolean
  noop?: boolean
  didIt: boolean
  date: string
  delta?: number
  newMilestones?: NewMilestone[]
}

export default function TodayPage() {
  const [focusPractice, setFocusPractice] = useState<Practice | null>(null)
  const [dots, setDots] = useState<DotEntry[]>([])
  const [todayDidIt, setTodayDidIt] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [logging, setLogging] = useState(false)
  const [logError, setLogError] = useState('')
  const [newMilestones, setNewMilestones] = useState<NewMilestone[]>([])

  const loadReturns = useCallback(async (practiceId: string) => {
    const res = await fetch(`/api/returns?practiceId=${practiceId}&days=14`)
    if (!res.ok) return
    const data: ReturnsData = await res.json()
    setDots(data.returns)
    const today = data.returns.find((d) => d.date === todayUTC())
    setTodayDidIt(today?.didIt ?? null)
  }, [])

  useEffect(() => {
    fetch('/api/practices/active')
      .then((res) => {
        if (!res.ok) throw new Error('Failed')
        return res.json() as Promise<ActiveData>
      })
      .then(async (data) => {
        const practice = data.todayFocusPracticeId
          ? practicesById.get(data.todayFocusPracticeId) ?? null
          : null
        setFocusPractice(practice)
        if (practice) await loadReturns(practice.id)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [loadReturns])

  async function handleLog(value: boolean) {
    if (!focusPractice) return

    // Toggle: clicking the active button again un-logs it
    const newValue = todayDidIt === value ? !value : value

    setLogging(true)
    setLogError('')
    try {
      const res = await fetch('/api/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practiceId: focusPractice.id, didIt: newValue }),
      })
      if (!res.ok) throw new Error('Failed to log return')
      const data: ReturnResponse = await res.json()
      setTodayDidIt(newValue)
      if (data.newMilestones && data.newMilestones.length > 0) {
        setNewMilestones(data.newMilestones)
      }
      await loadReturns(focusPractice.id)
    } catch {
      setLogError('Could not save. Please try again.')
    } finally {
      setLogging(false)
    }
  }

  return (
    <NarrowFormPage title="Today" description="Your daily check-in." metaLabel="OVERVIEW">
      <div className="space-y-6">

        {newMilestones.length > 0 && (
          <Card className="border-primary/40 bg-primary/5">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-primary">Milestone unlocked!</p>
              {newMilestones.map((m) => (
                <div key={`${m.type}-${m.threshold}`}>
                  <p className="text-sm font-medium text-foreground">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.description}</p>
                </div>
              ))}
              <button
                onClick={() => setNewMilestones([])}
                className="text-xs text-muted-foreground underline underline-offset-2 mt-1"
              >
                Dismiss
              </button>
            </div>
          </Card>
        )}

        {loading && <Loading text="Loading today's practice…" />}
        {!loading && error && (
          <ErrorState message="Couldn't load today's practice." onRetry={() => window.location.reload()} />
        )}

        {!loading && !error && !focusPractice && (
          <Card>
            <p className="text-sm text-muted-foreground">
              No focus practice set yet.{' '}
              <Link href="/practices" className="text-primary underline underline-offset-2">
                Set one from your practices →
              </Link>
            </p>
          </Card>
        )}

        {!loading && !error && focusPractice && (
          <>
            <Card>
              <div className="space-y-4">
                <div>
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                    style={{ backgroundColor: pillarColors[focusPractice.pillar] }}
                  >
                    {pillarLabels[focusPractice.pillar]}
                  </span>
                  <p className="mt-3 text-xl font-semibold text-foreground">{focusPractice.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{focusPractice.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    variant={todayDidIt === true ? 'default' : 'outline'}
                    disabled={logging}
                    onClick={() => handleLog(true)}
                  >
                    {logging && todayDidIt !== true ? '…' : '✓ Did it'}
                  </Button>
                  <Button
                    variant={todayDidIt === false ? 'secondary' : 'outline'}
                    disabled={logging}
                    onClick={() => handleLog(false)}
                  >
                    {logging && todayDidIt !== false ? '…' : 'Not today'}
                  </Button>
                </div>

                {todayDidIt === true && !logging && (
                  <p className="text-sm text-center text-muted-foreground">
                    Nice work. Keep it up tomorrow.
                  </p>
                )}
                {todayDidIt === false && !logging && (
                  <p className="text-sm text-center text-muted-foreground">
                    No worries. Tomorrow is a fresh start.
                  </p>
                )}
                {logError && (
                  <p className="text-xs text-destructive text-center">{logError}</p>
                )}
              </div>
            </Card>

            {/* 14-day dots */}
            <Card variant="subtle">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Last 14 days</p>
              <div className="flex flex-wrap gap-2">
                {dots.map((dot) => (
                  <span
                    key={dot.date}
                    title={dot.date}
                    className={`h-6 w-6 rounded-full border transition-colors ${
                      dot.didIt === true
                        ? 'bg-primary border-primary'
                        : dot.didIt === false
                        ? 'bg-muted border-border'
                        : 'bg-transparent border-border/40'
                    }`}
                  />
                ))}
              </div>
            </Card>
          </>
        )}

        <div className="flex justify-between items-center pt-2 text-sm">
          <Link href="/practices" className="text-muted-foreground hover:text-foreground transition-colors">
            ← Manage practices
          </Link>
          <Link href="/progress" className="text-muted-foreground hover:text-foreground transition-colors">
            View progress →
          </Link>
        </div>
      </div>
    </NarrowFormPage>
  );
}
