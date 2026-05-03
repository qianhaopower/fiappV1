'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { StandardPage } from '@/components/layout';
import { Card, Button, EmptyState, Loading, ErrorState } from '@/components/ui';
import { pillarColors } from '@/lib/design/pillarColors';
import { pillarLabels } from '@/lib/assessment/pillars';
import { practices } from '@/lib/practices/library';
import type { Pillar } from '@/lib/assessment/pillars';

type EnrichedPractice = {
  id: string
  pillar: Pillar
  title: string
  description: string
  addedAt: string
  status: 'active' | 'paused'
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
  activePractices: EnrichedPractice[]
  pausedPractices: EnrichedPractice[]
  trials: Trial[]
  subscriptionStatus: string
  todayFocusPracticeId: string | null
}

function PillarBadge({ pillar }: { pillar: Pillar }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
      style={{ backgroundColor: pillarColors[pillar] }}
    >
      {pillarLabels[pillar]}
    </span>
  );
}

function TrialBadge() {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
      Trying
    </span>
  );
}

function PausedBadge() {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
      Paused
    </span>
  );
}

function FocusBadge() {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/30">
      Today&apos;s focus
    </span>
  );
}

export default function PracticesPage() {
  const [data, setData] = useState<ActiveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [inlineError, setInlineError] = useState<Record<string, string>>({})
  const [inlineWarning, setInlineWarning] = useState<Record<string, string>>({})

  // Replace flow state
  const [replacingId, setReplacingId] = useState<string | null>(null)
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null)
  const [replaceToken, setReplaceToken] = useState<string | null>(null)

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

  function setAction(id: string, busy: boolean) {
    setActionLoading((p) => ({ ...p, [id]: busy }))
  }

  async function callApi(mode: string, practiceId: string, extra?: Record<string, string>) {
    const res = await fetch('/api/practice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, practiceId, ...extra }),
    })
    return res
  }

  async function handlePause(practiceId: string) {
    setAction(practiceId, true)
    setInlineError((p) => ({ ...p, [practiceId]: '' }))
    try {
      const res = await callApi('pause', practiceId)
      if (!res.ok) {
        setInlineError((p) => ({ ...p, [practiceId]: 'Could not pause. Try again.' }))
        return
      }
      await load()
    } finally {
      setAction(practiceId, false)
    }
  }

  async function handleResume(practiceId: string) {
    setAction(practiceId, true)
    setInlineError((p) => ({ ...p, [practiceId]: '' }))
    try {
      const res = await callApi('resume', practiceId)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = json.error === 'CAP_REACHED'
          ? `Active practice limit reached (${json.cap}). Pause another first.`
          : 'Could not resume. Try again.'
        setInlineError((p) => ({ ...p, [practiceId]: msg }))
        return
      }
      if (json.warning) {
        setInlineWarning((p) => ({ ...p, [practiceId]: `${json.remaining} slot${json.remaining === 1 ? '' : 's'} remaining` }))
      }
      await load()
    } finally {
      setAction(practiceId, false)
    }
  }

  async function handleSetFocus(practiceId: string) {
    setAction(practiceId, true)
    setInlineError((p) => ({ ...p, [practiceId]: '' }))
    try {
      const res = await callApi('setFocus', practiceId)
      if (!res.ok) {
        setInlineError((p) => ({ ...p, [practiceId]: 'Could not set focus. Try again.' }))
        return
      }
      await load()
    } finally {
      setAction(practiceId, false)
    }
  }

  async function handleTrialAction(mode: 'promoteTrial' | 'discardTrial', practiceId: string) {
    setAction(practiceId, true)
    setInlineError((p) => ({ ...p, [practiceId]: '' }))
    try {
      const res = await callApi(mode, practiceId)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = json.error === 'CAP_REACHED'
          ? `Active practice limit reached (${json.cap}).`
          : json.error === 'TRIAL_EXPIRED'
          ? 'This trial has expired.'
          : 'Something went wrong. Try again.'
        setInlineError((p) => ({ ...p, [practiceId]: msg }))
        return
      }
      await load()
    } finally {
      setAction(practiceId, false)
    }
  }

  // Replace: step 1 — select target, get confirmToken
  async function handleReplaceSelect(fromId: string, toId: string) {
    setAction(fromId, true)
    setInlineError((p) => ({ ...p, [fromId]: '' }))
    try {
      const res = await fetch('/api/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'replace', practiceId: toId, replacePracticeId: fromId }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 202 && json.confirmToken) {
        setReplaceToken(json.confirmToken)
        setReplaceTarget(toId)
        // stay in replace mode to show confirm step
      } else {
        setInlineError((p) => ({ ...p, [fromId]: 'Could not initiate replace. Try again.' }))
        setReplacingId(null)
      }
    } finally {
      setAction(fromId, false)
    }
  }

  // Replace: step 2 — confirm
  async function handleReplaceConfirm(fromId: string) {
    if (!replaceTarget || !replaceToken) return
    setAction(fromId, true)
    setInlineError((p) => ({ ...p, [fromId]: '' }))
    try {
      const res = await fetch('/api/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'replace',
          practiceId: replaceTarget,
          replacePracticeId: fromId,
          confirmToken: replaceToken,
        }),
      })
      if (!res.ok) {
        setInlineError((p) => ({ ...p, [fromId]: 'Replace failed. Try again.' }))
        return
      }
      setReplacingId(null)
      setReplaceTarget(null)
      setReplaceToken(null)
      await load()
    } finally {
      setAction(fromId, false)
    }
  }

  // Practices available to replace with (not already active or a trial)
  const activeAndTrialIds = new Set([
    ...(data?.activePractices.map((p) => p.id) ?? []),
    ...(data?.trials.map((t) => t.id) ?? []),
  ])
  const replaceCandidates = practices.filter((p) => !activeAndTrialIds.has(p.id))

  return (
    <StandardPage
      title="My Practices"
      description="Your committed practices and what you're testing."
      metaLabel="PRACTICES"
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/results">+ Add practice</Link>
        </Button>
      }
    >
      <div className="space-y-10">
        {loading && <Loading text="Loading your practices…" />}
        {!loading && error && <ErrorState message="Couldn't load practices." onRetry={load} />}

        {!loading && !error && data && (() => {
          const activeTrials = data.trials.filter((t) => t.active)
          const expiredTrials = data.trials.filter((t) => !t.active)
          const visibleCount = data.activePractices.length + activeTrials.length + data.pausedPractices.length
          return (
          <>
            {visibleCount === 0 ? (
              expiredTrials.length > 0 ? (
                <EmptyState
                  title={expiredTrials.length === 1 ? `Your trial of "${expiredTrials[0].title}" ended` : 'Your trials ended'}
                  text="Ready to commit to something? Browse your results and pick a practice."
                  action={<Button variant="outline" asChild><Link href="/results">Browse suggestions</Link></Button>}
                />
              ) : (
                <EmptyState
                  title="No practices yet"
                  text="Pick practices from your results to start building your routine."
                  action={<Button variant="outline" asChild><Link href="/results">Browse suggestions</Link></Button>}
                />
              )
            ) : (
              <div className="space-y-3">
                {data.activePractices.map((p) => {
                  const isFocus = data.todayFocusPracticeId === p.id
                  const isReplacing = replacingId === p.id
                  const confirmed = isReplacing && !!replaceToken
                  return (
                    <Card key={p.id} variant="interactive">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <PillarBadge pillar={p.pillar} />
                            {isFocus && <FocusBadge />}
                          </div>
                          <p className="font-semibold text-foreground">{p.title}</p>
                          <p className="text-sm text-muted-foreground">{p.description}</p>
                          {inlineError[p.id] && (
                            <p className="text-xs text-destructive">{inlineError[p.id]}</p>
                          )}
                          {inlineWarning[p.id] && (
                            <p className="text-xs text-amber-700">{inlineWarning[p.id]}</p>
                          )}

                          {isReplacing && !confirmed && (
                            <div className="mt-3 space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">Pick a replacement:</p>
                              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
                                {replaceCandidates.map((c) => (
                                  <button
                                    key={c.id}
                                    className="text-left text-sm px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                                    onClick={() => handleReplaceSelect(p.id, c.id)}
                                    disabled={!!actionLoading[p.id]}
                                  >
                                    <span className="font-medium">{c.title}</span>
                                    <span className="text-muted-foreground"> · {pillarLabels[c.pillar]}</span>
                                  </button>
                                ))}
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => { setReplacingId(null); setReplaceToken(null); setReplaceTarget(null) }}>
                                Cancel
                              </Button>
                            </div>
                          )}

                          {isReplacing && confirmed && replaceTarget && (
                            <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
                              <p className="text-sm font-medium text-amber-900">
                                Replace with &ldquo;{practicesById(replaceTarget)}&rdquo;?
                              </p>
                              <div className="flex gap-2">
                                <Button size="sm" variant="default" disabled={!!actionLoading[p.id]} onClick={() => handleReplaceConfirm(p.id)}>
                                  {actionLoading[p.id] ? '…' : 'Confirm'}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setReplacingId(null); setReplaceToken(null); setReplaceTarget(null) }}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {!isReplacing && (
                          <div className="flex flex-col gap-2 shrink-0">
                            {!isFocus && (
                              <Button size="sm" variant="outline" disabled={!!actionLoading[p.id]} onClick={() => handleSetFocus(p.id)}>
                                {actionLoading[p.id] ? '…' : 'Set focus'}
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" disabled={!!actionLoading[p.id]} onClick={() => handlePause(p.id)}>
                              Pause
                            </Button>
                            <Button size="sm" variant="ghost" disabled={!!actionLoading[p.id]} onClick={() => { setReplacingId(p.id); setReplaceToken(null); setReplaceTarget(null) }}>
                              Replace
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}

                {activeTrials.map((t) => (
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
                          {t.daysRemaining === 0 ? 'Expires today' : `${t.daysRemaining} day${t.daysRemaining === 1 ? '' : 's'} left to decide`}
                        </p>
                      )}
                      {!t.active && <p className="text-xs text-muted-foreground">Trial expired</p>}
                      {inlineError[t.id] && <p className="text-xs text-destructive">{inlineError[t.id]}</p>}
                    </div>
                    {t.active && (
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button size="sm" variant="default" disabled={!!actionLoading[t.id]} onClick={() => handleTrialAction('promoteTrial', t.id)}>
                          {actionLoading[t.id] ? '…' : 'Keep it'}
                        </Button>
                        <Button size="sm" variant="ghost" disabled={!!actionLoading[t.id]} onClick={() => handleTrialAction('discardTrial', t.id)}>
                          Not for me
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}

                {data.pausedPractices.map((p) => (
                  <Card key={p.id} variant="interactive" className="flex items-start justify-between gap-4 opacity-70">
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <PillarBadge pillar={p.pillar} />
                        <PausedBadge />
                      </div>
                      <p className="font-semibold text-foreground">{p.title}</p>
                      <p className="text-sm text-muted-foreground">{p.description}</p>
                      {inlineError[p.id] && <p className="text-xs text-destructive">{inlineError[p.id]}</p>}
                      {inlineWarning[p.id] && <p className="text-xs text-amber-700">{inlineWarning[p.id]}</p>}
                    </div>
                    <Button size="sm" variant="outline" disabled={!!actionLoading[p.id]} onClick={() => handleResume(p.id)}>
                      {actionLoading[p.id] ? '…' : 'Resume'}
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </>
          )
        })()}

        <div className="pt-2">
          <Button asChild>
            <Link href="/today">Go to Today →</Link>
          </Button>
        </div>
      </div>
    </StandardPage>
  );
}

// helper used in JSX
function practicesById(id: string): string {
  return practices.find((p) => p.id === id)?.title ?? id
}
