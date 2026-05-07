'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { HelpTooltip } from '@/components/HelpTooltip';
import { NarrowFormPage } from '@/components/layout';
import { Card, Button, Loading, ErrorState } from '@/components/ui';
import { pillarColors } from '@/lib/design/pillarColors';
import { pillarLabels } from '@/lib/assessment/pillars';
import { practicesById } from '@/lib/practices/library';
import { todayUTC } from '@/lib/returns/returns';
import type { Practice } from '@/lib/practices/library';
import type { Pillar } from '@/lib/assessment/pillars';
import type { DotEntry } from '@/lib/returns/returns';
import type { NewMilestone } from '@/lib/milestones/milestones';

type Trial = {
  id: string
  pillar: Pillar
  title: string
  description: string
  daysRemaining: number
  active: boolean
}

type ActiveData = {
  todayFocusPracticeId: string | null
  trials: Trial[]
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
  const [activeTrials, setActiveTrials] = useState<Trial[]>([])
  const [dots, setDots] = useState<DotEntry[]>([])
  const [todayDidIt, setTodayDidIt] = useState<boolean | null>(null)
  const [trialDidIt, setTrialDidIt] = useState<Record<string, boolean | null>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [logging, setLogging] = useState(false)
  const [trialLogging, setTrialLogging] = useState<Record<string, boolean>>({})
  const [logError, setLogError] = useState('')
  const [trialLogError, setTrialLogError] = useState<Record<string, string>>({})
  const [newMilestones, setNewMilestones] = useState<NewMilestone[]>([])
  const [justLogged, setJustLogged] = useState(false)

  const loadReturns = useCallback(async (practiceId: string) => {
    const res = await fetch(`/api/returns?practiceId=${practiceId}&days=14`)
    if (!res.ok) return
    const data: ReturnsData = await res.json()
    setDots(data.returns)
    const today = data.returns.find((d) => d.date === todayUTC())
    setTodayDidIt(today?.didIt ?? null)
  }, [])

  const loadTrialReturn = useCallback(async (practiceId: string) => {
    const res = await fetch(`/api/returns?practiceId=${practiceId}&days=1`)
    if (!res.ok) return
    const data: ReturnsData = await res.json()
    const today = data.returns.find((d) => d.date === todayUTC())
    setTrialDidIt((prev) => ({ ...prev, [practiceId]: today?.didIt ?? null }))
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

        const trials = (data.trials ?? []).filter((t) => t.active)
        setActiveTrials(trials)
        await Promise.all(trials.map((t) => loadTrialReturn(t.id)))
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [loadReturns, loadTrialReturn])

  async function handleLog(value: boolean) {
    if (!focusPractice) return
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
      if (newValue === true) {
        setJustLogged(true)
        setTimeout(() => setJustLogged(false), 700)
      }
    } catch {
      setLogError('Could not save. Please try again.')
    } finally {
      setLogging(false)
    }
  }

  async function handleTrialLog(practiceId: string, value: boolean) {
    const current = trialDidIt[practiceId] ?? null
    const newValue = current === value ? !value : value
    setTrialLogging((prev) => ({ ...prev, [practiceId]: true }))
    setTrialLogError((prev) => ({ ...prev, [practiceId]: '' }))
    try {
      const res = await fetch('/api/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practiceId, didIt: newValue }),
      })
      if (!res.ok) throw new Error('Failed')
      const data: ReturnResponse = await res.json()
      setTrialDidIt((prev) => ({ ...prev, [practiceId]: newValue }))
      if (data.newMilestones && data.newMilestones.length > 0) {
        setNewMilestones(data.newMilestones)
      }
    } catch {
      setTrialLogError((prev) => ({ ...prev, [practiceId]: 'Could not save. Try again.' }))
    } finally {
      setTrialLogging((prev) => ({ ...prev, [practiceId]: false }))
    }
  }

  return (
    <NarrowFormPage title="Today">
      <div className="space-y-8">

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
              <div className="space-y-5">
                {/* Context */}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                      style={{ backgroundColor: pillarColors[focusPractice.pillar] }}
                    >
                      {pillarLabels[focusPractice.pillar]}
                    </span>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/30">
                      Today&apos;s focus
                    </span>
                  </div>
                  <p className="mt-3 text-xl font-semibold text-foreground">{focusPractice.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{focusPractice.description}</p>
                </div>

                {/* Primary action */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-end gap-1.5 mb-1">
                    <HelpTooltip content="'Did it' logs that you completed your practice today. 'Not today' logs that you skipped — no judgment, it still counts as showing up. You can change your answer any time today." />
                  </div>
                  <Button
                    size="lg"
                    variant={todayDidIt === true ? 'default' : 'outline'}
                    disabled={logging}
                    onClick={() => handleLog(true)}
                    className={`w-full font-semibold ${todayDidIt !== true ? 'border-primary/40 text-primary hover:bg-primary/5' : ''} ${justLogged ? 'animate-button-confirm' : ''}`}
                  >
                    {logging && todayDidIt !== true ? '…' : '✓ Did it'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={logging}
                    onClick={() => handleLog(false)}
                    className="w-full text-muted-foreground hover:text-foreground"
                  >
                    {logging && todayDidIt !== false ? '…' : 'Not today'}
                  </Button>
                </div>

                {todayDidIt === true && !logging && (
                  <p className="text-sm text-center text-muted-foreground">
                    {(() => {
                      const doneCount = dots.filter(d => d.didIt === true).length
                      return `You've done this ${doneCount} ${doneCount === 1 ? 'time' : 'times'}.`
                    })()}
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

            {/* 14-day dots — only shown after first check-in */}
            {dots.some((d) => d.didIt !== null) && <Card variant="subtle">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Last 14 days</p>
              <div className="flex flex-wrap gap-2">
                {dots.map((dot) => {
                  const d = new Date(dot.date + 'T00:00:00Z')
                  const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
                  const tooltip = dot.didIt === true ? `${label} · Did it` : dot.didIt === false ? `${label} · Skipped` : label
                  return (
                    <span
                      key={dot.date}
                      title={tooltip}
                      className={`h-6 w-6 rounded-full border transition-colors ${
                        dot.didIt === true
                          ? 'bg-primary border-primary'
                          : dot.didIt === false
                          ? 'bg-foreground/20 border-foreground/35'
                          : 'bg-muted/70 border-border/50'
                      } ${justLogged && dot.date === todayUTC() ? 'animate-dot-pop' : ''}`}
                    />
                  )
                })}
              </div>
            </Card>}
          </>
        )}

        {!loading && !error && activeTrials.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Trying out</p>
            <div className="space-y-3">
              {activeTrials.map((trial) => {
                const didIt = trialDidIt[trial.id] ?? null
                const busy = !!trialLogging[trial.id]
                return (
                  <Card key={trial.id} variant="subtle">
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                            style={{ backgroundColor: pillarColors[trial.pillar] }}
                          >
                            {pillarLabels[trial.pillar]}
                          </span>
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                            {trial.daysRemaining}d left to decide
                          </span>
                        </div>
                        <p className="mt-3 font-semibold text-foreground">{trial.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{trial.description}</p>
                      </div>
                      <div className="space-y-1.5">
                        <Button
                          variant={didIt === true ? 'default' : 'outline'}
                          disabled={busy}
                          onClick={() => handleTrialLog(trial.id, true)}
                          className={`w-full ${didIt !== true ? 'border-border/60' : ''}`}
                        >
                          {busy ? '…' : '✓ Did it'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => handleTrialLog(trial.id, false)}
                          className="w-full text-muted-foreground hover:text-foreground"
                        >
                          {busy ? '…' : 'Not today'}
                        </Button>
                      </div>
                      {trialLogError[trial.id] && (
                        <p className="text-xs text-destructive">{trialLogError[trial.id]}</p>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
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
