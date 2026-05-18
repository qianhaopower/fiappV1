'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { StandardPage } from '@/components/layout';
import { Card, Button, Loading, ErrorState } from '@/components/ui';
import { CapLimitNotice } from '@/components/CapLimitNotice';
import { pillarColors } from '@/lib/design/pillarColors';
import { pillarLabels, pillarOrder } from '@/lib/assessment/pillars';
import { practices } from '@/lib/practices/library';
import type { Pillar } from '@/lib/assessment/pillars';
import type { Practice } from '@/lib/practices/library';

type EnrichedPractice = {
  id: string
  pillar: Pillar
  title: string
  description: string
  status: 'active' | 'inactive'
}

type ActiveData = {
  activePractices: EnrichedPractice[]
  inactivePractices: EnrichedPractice[]
  subscriptionStatus: 'FREE' | 'PAID' | string
}

type MeData = {
  ok: boolean
  data: {
    returnCounters?: Record<string, number> | string
  }
}

type CardStatus = 'none' | 'active' | 'inactive'

type SwitchState = {
  newPractice: Practice
  currentActive: EnrichedPractice
} | null

function parseCounters(raw: Record<string, number> | string | undefined): Record<string, number> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as Record<string, number> } catch { return {} }
  }
  return raw
}

export default function PracticesPage() {
  const [data, setData] = useState<ActiveData | null>(null)
  const [counters, setCounters] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [inlineError, setInlineError] = useState<Record<string, string>>({})
  const [capNotice, setCapNotice] = useState<Record<string, number>>({})
  const [switchState, setSwitchState] = useState<SwitchState>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [activeRes, meRes] = await Promise.all([
        fetch('/api/practices/active'),
        fetch('/api/me'),
      ])
      if (!activeRes.ok) throw new Error('Failed to load practices')
      const activeData = (await activeRes.json()) as ActiveData
      setData(activeData)
      if (meRes.ok) {
        const meJson = (await meRes.json()) as MeData
        setCounters(parseCounters(meJson.data?.returnCounters))
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const statusById = useMemo(() => {
    const map = new Map<string, CardStatus>()
    for (const p of data?.activePractices ?? []) map.set(p.id, 'active')
    for (const p of data?.inactivePractices ?? []) map.set(p.id, 'inactive')
    return map
  }, [data])

  function setAction(id: string, busy: boolean) {
    setActionLoading((p) => ({ ...p, [id]: busy }))
  }

  async function callPractice(body: Record<string, unknown>) {
    return fetch('/api/practice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  async function handleStart(practice: Practice) {
    setAction(practice.id, true)
    setInlineError((p) => ({ ...p, [practice.id]: '' }))
    setCapNotice((p) => ({ ...p, [practice.id]: 0 }))
    try {
      const res = await callPractice({ mode: 'startPractice', practiceId: practice.id })
      const json = await res.json().catch(() => ({} as Record<string, unknown>))
      if (res.ok) {
        await load()
        return
      }
      if (res.status === 409 && (json as { error?: string }).error === 'CAP_REACHED') {
        const isFree = (data?.subscriptionStatus ?? 'FREE').toUpperCase() !== 'PAID'
        if (isFree && data?.activePractices.length === 1) {
          setSwitchState({ newPractice: practice, currentActive: data.activePractices[0] })
          return
        }
        const cap = (json as { cap?: number }).cap ?? 10
        setCapNotice((p) => ({ ...p, [practice.id]: cap }))
        return
      }
      setInlineError((p) => ({ ...p, [practice.id]: 'Could not start. Please try again.' }))
    } finally {
      setAction(practice.id, false)
    }
  }

  async function handleMakeInactive(practiceId: string) {
    setAction(practiceId, true)
    setInlineError((p) => ({ ...p, [practiceId]: '' }))
    try {
      const res = await callPractice({ mode: 'makePracticeInactive', practiceId })
      if (!res.ok) {
        setInlineError((p) => ({ ...p, [practiceId]: 'Could not pause. Try again.' }))
        return
      }
      await load()
    } finally {
      setAction(practiceId, false)
    }
  }

  async function handleSwitchConfirm() {
    if (!switchState) return
    const { newPractice, currentActive } = switchState
    setAction(newPractice.id, true)
    setInlineError((p) => ({ ...p, [newPractice.id]: '' }))
    try {
      const res = await callPractice({
        mode: 'switchToPractice',
        practiceId: newPractice.id,
        deactivatePracticeId: currentActive.id,
      })
      if (!res.ok) {
        setInlineError((p) => ({ ...p, [newPractice.id]: 'Could not switch. Try again.' }))
        return
      }
      setSwitchState(null)
      await load()
    } finally {
      setAction(newPractice.id, false)
    }
  }

  const practicesByPillar = useMemo(() => {
    const map = new Map<Pillar, Practice[]>()
    for (const pillar of pillarOrder) {
      map.set(pillar, practices.filter((p) => p.pillar === pillar).sort((a, b) => a.order - b.order))
    }
    return map
  }, [])

  return (
    <StandardPage
      title="Practice Bank"
      description="All 35 practices, grouped by pillar."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/today">Go to Today →</Link>
        </Button>
      }
    >
      <div className="space-y-10">
        {loading && <Loading text="Loading practices…" />}
        {!loading && error && <ErrorState message="Couldn't load practices." onRetry={load} />}

        {!loading && !error && (
          <nav
            aria-label="Jump to pillar"
            className="-mb-4 flex flex-wrap gap-1.5 sm:gap-2 pb-4 border-b border-border/40"
          >
            {pillarOrder.map((pillar) => (
              <a
                key={pillar}
                href={`#pillar-${pillar}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs text-foreground no-underline hover:bg-muted/40 transition-colors"
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: pillarColors[pillar] }}
                  aria-hidden="true"
                />
                {pillarLabels[pillar]}
              </a>
            ))}
          </nav>
        )}

        {!loading && !error && pillarOrder.map((pillar) => (
          <section
            key={pillar}
            id={`pillar-${pillar}`}
            className="space-y-3 scroll-mt-20"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: pillarColors[pillar] }}
              />
              <h2 className="text-base font-semibold text-foreground">
                {pillarLabels[pillar]} Intelligence
              </h2>
            </div>
            <div className="space-y-3">
              {(practicesByPillar.get(pillar) ?? []).map((p) => {
                const status: CardStatus = statusById.get(p.id) ?? 'none'
                const completions = counters[p.id] ?? 0
                const busy = !!actionLoading[p.id]
                return (
                  <Card key={p.id} variant="interactive">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2 min-w-0 sm:flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                            style={{ backgroundColor: pillarColors[p.pillar] }}
                          >
                            {pillarLabels[p.pillar]}
                          </span>
                          {status === 'active' && (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/30">
                              Active
                            </span>
                          )}
                          {status === 'inactive' && (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground border border-border">
                              Paused
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-foreground">{p.title}</p>
                        <p className="text-sm text-muted-foreground">{p.description}</p>
                        {status === 'inactive' && (
                          <p className="text-xs text-muted-foreground">
                            {completions > 0
                              ? `You've practiced this ${completions} ${completions === 1 ? 'time' : 'times'} before — currently paused. Resume anytime.`
                              : "You started this before — currently paused. Resume anytime."}
                          </p>
                        )}
                        {capNotice[p.id] ? (
                          <CapLimitNotice cap={capNotice[p.id]} />
                        ) : inlineError[p.id] ? (
                          <p className="text-xs text-destructive">{inlineError[p.id]}</p>
                        ) : null}
                      </div>

                      <div className="flex flex-row gap-2 sm:flex-col sm:shrink-0">
                        {status === 'none' && (
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => handleStart(p)}>
                            {busy ? '…' : 'Start this practice'}
                          </Button>
                        )}
                        {status === 'inactive' && (
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => handleStart(p)}>
                            {busy ? '…' : 'Resume'}
                          </Button>
                        )}
                        {status === 'active' && (
                          <>
                            <Button size="sm" asChild>
                              <Link href="/today">View on Today</Link>
                            </Button>
                            <Button size="sm" variant="ghost" disabled={busy} onClick={() => handleMakeInactive(p.id)}>
                              {busy ? '…' : 'Pause'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {switchState && (
        <SwitchDialog
          newPractice={switchState.newPractice}
          currentActive={switchState.currentActive}
          loading={!!actionLoading[switchState.newPractice.id]}
          onConfirm={handleSwitchConfirm}
          onCancel={() => setSwitchState(null)}
        />
      )}
    </StandardPage>
  );
}

function SwitchDialog({
  newPractice,
  currentActive,
  loading,
  onConfirm,
  onCancel,
}: {
  newPractice: Practice
  currentActive: EnrichedPractice
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-xl p-6 space-y-4">
        <p className="text-base font-semibold text-foreground">
          Switch to &ldquo;{newPractice.title}&rdquo;?
        </p>
        <p className="text-sm text-muted-foreground">
          &ldquo;{currentActive.title}&rdquo; will be paused. You can resume it anytime.
        </p>
        <div className="flex gap-2 pt-2">
          <Button disabled={loading} onClick={onConfirm}>
            {loading ? '…' : 'Switch'}
          </Button>
          <Button variant="ghost" disabled={loading} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
