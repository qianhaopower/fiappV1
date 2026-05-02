'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { StandardPage } from '@/components/layout';
import { Card, Button, EmptyState, Loading, ErrorState } from '@/components/ui';
import { pillarColors } from '@/lib/design/pillarColors';
import { MOCK_PILLAR_LABELS } from '@/lib/mockState';
import type { Pillar } from '@/lib/assessment/pillars';

type ActivePractice = {
  id: string
  pillar: Pillar
  title: string
  description: string
  addedAt: string
}

type Trial = {
  id: string
  pillar: Pillar
  title: string
  description: string
  trialSK: string
  startedAt: string
  expiresAt: string
  status: 'trial' | 'expired'
  daysRemaining: number
  active: boolean
}

type ActiveData = {
  activePractices: ActivePractice[]
  trials: Trial[]
  subscriptionStatus: string
}

function PillarBadge({ pillar }: { pillar: Pillar }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
      style={{ backgroundColor: pillarColors[pillar] }}
    >
      {MOCK_PILLAR_LABELS[pillar]}
    </span>
  );
}

function TrialBadge() {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
      Trial
    </span>
  );
}

export default function PracticesPage() {
  const [data, setData] = useState<ActiveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/practices/active')
      if (!res.ok) throw new Error('Failed to load')
      setData(await res.json())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAction(mode: 'promoteTrial' | 'discardTrial', practiceId: string) {
    setActionLoading((prev) => ({ ...prev, [practiceId]: true }))
    try {
      const res = await fetch('/api/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, practiceId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = err.error === 'CAP_REACHED'
          ? `You've reached your active practice limit (${err.cap}).`
          : err.error === 'TRIAL_EXPIRED'
          ? 'This trial has expired and can no longer be promoted.'
          : 'Something went wrong. Please try again.'
        alert(msg)
        return
      }
      await load()
    } finally {
      setActionLoading((prev) => ({ ...prev, [practiceId]: false }))
    }
  }

  return (
    <StandardPage
      title="Active Practices"
      description="Manage your practices and trials."
      metaLabel="PRACTICES"
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/results">+ Add practice</Link>
        </Button>
      }
    >
      <div className="space-y-10">
        {loading && <Loading text="Loading your practices…" />}

        {!loading && error && (
          <ErrorState message="Couldn't load practices." onRetry={load} />
        )}

        {!loading && !error && data && (
          <>
            {/* Active practices */}
            <section>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Active</p>
              {data.activePractices.length === 0 ? (
                <EmptyState
                  title="No active practices"
                  text="Promote a trial or pick one from your results to get started."
                  action={
                    <Button variant="outline" asChild>
                      <Link href="/results">Browse suggestions</Link>
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {data.activePractices.map((p) => (
                    <Card key={p.id} variant="interactive" className="flex items-start justify-between gap-4">
                      <div className="space-y-2 min-w-0">
                        <PillarBadge pillar={p.pillar} />
                        <p className="font-semibold text-foreground">{p.title}</p>
                        <p className="text-sm text-muted-foreground">{p.description}</p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button size="sm" variant="outline">Set focus</Button>
                        <Button size="sm" variant="ghost">Pause</Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Trials */}
            <section>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Trials</p>
              {data.trials.length === 0 ? (
                <EmptyState
                  title="No active trials"
                  text="Try a practice for 7 days before committing."
                  action={
                    <Button variant="outline" asChild>
                      <Link href="/results">Find a practice</Link>
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {data.trials.map((t) => (
                    <Card key={t.id} variant="interactive" className="flex items-start justify-between gap-4">
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <PillarBadge pillar={t.pillar} />
                          <TrialBadge />
                        </div>
                        <p className="font-semibold text-foreground">{t.title}</p>
                        <p className="text-sm text-muted-foreground">{t.description}</p>
                        {t.active && (
                          <p className="text-xs text-amber-700 font-medium">
                            {t.daysRemaining === 0
                              ? 'Expires today'
                              : `${t.daysRemaining} day${t.daysRemaining === 1 ? '' : 's'} remaining`}
                          </p>
                        )}
                        {!t.active && (
                          <p className="text-xs text-muted-foreground">Trial expired</p>
                        )}
                      </div>
                      {t.active && (
                        <div className="flex flex-col gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="default"
                            disabled={!!actionLoading[t.id]}
                            onClick={() => handleAction('promoteTrial', t.id)}
                          >
                            {actionLoading[t.id] ? '…' : 'Promote'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!!actionLoading[t.id]}
                            onClick={() => handleAction('discardTrial', t.id)}
                          >
                            Discard
                          </Button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* CTA */}
        <div className="pt-2">
          <Button asChild>
            <Link href="/today">Go to Today →</Link>
          </Button>
        </div>
      </div>
    </StandardPage>
  );
}
