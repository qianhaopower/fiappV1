'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { HelpTooltip } from '@/components/HelpTooltip';
import { NarrowFormPage } from '@/components/layout';
import { Card, Button, Loading, ErrorState } from '@/components/ui';
import { pillarColors } from '@/lib/design/pillarColors';
import { pillarLabels } from '@/lib/assessment/pillars';
import type { Pillar } from '@/lib/assessment/pillars';
import type { DotEntry } from '@/lib/returns/returns';
import type { NewMilestone } from '@/lib/milestones/milestones';
import { celebrateDaily, celebrateMilestone } from '@/lib/celebrate';

type ActivePractice = {
  id: string
  pillar: Pillar
  title: string
  description: string
}

type ActiveData = {
  activePractices: ActivePractice[]
}

type ReturnsData = {
  returns: DotEntry[]
  currentReturnDate?: string
}

type ReturnResponse = {
  ok: boolean
  noop?: boolean
  didIt: boolean
  date: string
  delta?: number
  newMilestones?: NewMilestone[]
}

type PracticeState = {
  dots: DotEntry[]
  currentReturnDate: string | null
  didIt: boolean | null
  logging: boolean
  loggingValue: boolean | null
  logError: string
  justLogged: boolean
}

const emptyState: PracticeState = {
  dots: [],
  currentReturnDate: null,
  didIt: null,
  logging: false,
  loggingValue: null,
  logError: '',
  justLogged: false,
}

export default function TodayPage() {
  const [practices, setPractices] = useState<ActivePractice[]>([])
  const [stateById, setStateById] = useState<Record<string, PracticeState>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [newMilestones, setNewMilestones] = useState<NewMilestone[]>([])

  const patchState = useCallback((id: string, patch: Partial<PracticeState>) => {
    setStateById((prev) => ({ ...prev, [id]: { ...(prev[id] ?? emptyState), ...patch } }))
  }, [])

  const loadReturns = useCallback(async (practiceId: string) => {
    const res = await fetch(`/api/returns?practiceId=${practiceId}&days=14`)
    if (!res.ok) return
    const data: ReturnsData = await res.json()
    const returnDate = data.currentReturnDate ?? null
    const today = data.returns.find((d) => d.date === returnDate)
    patchState(practiceId, {
      dots: data.returns,
      currentReturnDate: returnDate,
      didIt: today?.didIt ?? null,
    })
  }, [patchState])

  useEffect(() => {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const storageKey = 'fi_tz_synced'
    if (typeof localStorage !== 'undefined' && localStorage.getItem(storageKey) === browserTz) return
    fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: browserTz }),
    })
      .then((r) => { if (r.ok && typeof localStorage !== 'undefined') localStorage.setItem(storageKey, browserTz) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/practices/active')
      .then((res) => {
        if (!res.ok) throw new Error('Failed')
        return res.json() as Promise<ActiveData>
      })
      .then(async (data) => {
        const list = data.activePractices ?? []
        setPractices(list)
        await Promise.all(list.map((p) => loadReturns(p.id)))
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [loadReturns])

  async function handleLog(
    practiceId: string,
    value: boolean,
    origin?: { x: number; y: number }
  ) {
    const current = stateById[practiceId]?.didIt ?? null
    if (current === value) return
    patchState(practiceId, { logging: true, loggingValue: value, logError: '' })
    try {
      const res = await fetch('/api/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practiceId, didIt: value }),
      })
      if (!res.ok) throw new Error('Failed to log return')
      const data: ReturnResponse = await res.json()
      patchState(practiceId, { didIt: value })
      const hasMilestone = !!(data.newMilestones && data.newMilestones.length > 0)
      if (hasMilestone) {
        setNewMilestones((prev) => [...prev, ...data.newMilestones!])
      }
      await loadReturns(practiceId)
      if (value === true) {
        patchState(practiceId, { justLogged: true })
        setTimeout(() => patchState(practiceId, { justLogged: false }), 700)
        // Milestone supersedes the daily burst — never fire both at once
        if (hasMilestone) {
          celebrateMilestone()
        } else {
          celebrateDaily(origin)
        }
      }
    } catch {
      patchState(practiceId, { logError: 'Could not save. Please try again.' })
    } finally {
      patchState(practiceId, { logging: false, loggingValue: null })
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
                <div key={`${m.type}-${m.threshold}-${m.practiceId ?? 'total'}`}>
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

        {loading && <Loading text="Loading today's practices…" />}
        {!loading && error && (
          <ErrorState message="Couldn't load today's practices." onRetry={() => window.location.reload()} />
        )}

        {!loading && !error && practices.length === 0 && (
          <Card>
            <div className="space-y-3">
              <p className="text-base font-semibold text-foreground">Choose one practice to start.</p>
              <p className="text-sm text-muted-foreground">
                Pick something from your practice bank to begin building a daily habit.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild size="sm">
                  <Link href="/practices">Browse practices →</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/assessment">Take assessment</Link>
                </Button>
              </div>
            </div>
          </Card>
        )}

        {!loading && !error && practices.map((p) => {
          const s = stateById[p.id] ?? emptyState
          const doneCount = s.dots.filter((d) => d.didIt === true).length
          return (
            <Card key={p.id}>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                      style={{ backgroundColor: pillarColors[p.pillar] }}
                    >
                      {pillarLabels[p.pillar]}
                    </span>
                    <HelpTooltip content="'Did it' logs that you completed your practice today. 'Not today' logs that you skipped — no judgment, it still counts as showing up. You can change your answer any time today." />
                  </div>
                  <p className="mt-3 text-xl font-semibold text-foreground">{p.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                </div>

                <div className="space-y-2 pt-1">
                  <Button
                    size="lg"
                    variant={s.didIt === true ? 'default' : 'outline'}
                    disabled={s.logging}
                    onClick={(e) => handleLog(p.id, true, { x: e.clientX, y: e.clientY })}
                    className={`w-full font-semibold ${s.didIt === null ? 'border-primary/40 text-primary hover:bg-primary/5' : ''} ${s.justLogged ? 'animate-button-confirm' : ''}`}
                  >
                    {s.logging && s.loggingValue === true ? '…' : '✓ Did it'}
                  </Button>
                  <Button
                    size="sm"
                    variant={s.didIt === false ? 'outline' : 'ghost'}
                    disabled={s.logging}
                    onClick={() => handleLog(p.id, false)}
                    className={`w-full ${s.didIt === false ? 'border-border/50 text-muted-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {s.logging && s.loggingValue === false ? '…' : 'Not today'}
                  </Button>
                </div>

                {s.didIt === true && !s.logging && (
                  <p className="text-sm text-center text-muted-foreground">
                    You&apos;ve done this {doneCount} {doneCount === 1 ? 'time' : 'times'}.
                  </p>
                )}
                {s.didIt === false && !s.logging && (
                  <p className="text-sm text-center text-muted-foreground">
                    No worries. Tomorrow is a fresh start.
                  </p>
                )}
                {s.logError && (
                  <p className="text-xs text-destructive text-center">{s.logError}</p>
                )}

                {s.dots.some((d) => d.didIt !== null) && (
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Last 14 days</p>
                    <div className="flex flex-wrap gap-2">
                      {s.dots.map((dot) => {
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
                            } ${s.justLogged && dot.date === s.currentReturnDate ? 'animate-dot-pop' : ''}`}
                          />
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )
        })}

        <div className="flex justify-between items-center pt-2 text-sm">
          <Link href="/practices" className="text-muted-foreground hover:text-foreground transition-colors">
            ← Browse practices
          </Link>
          <Link href="/progress" className="text-muted-foreground hover:text-foreground transition-colors">
            View progress →
          </Link>
        </div>
      </div>
    </NarrowFormPage>
  );
}
