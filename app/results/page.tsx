'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { HelpTooltip } from '@/components/HelpTooltip';
import { StandardPage } from '@/components/layout';
import { Card, Button, Loading, ErrorState, EmptyState } from '@/components/ui';
import { CapLimitNotice } from '@/components/CapLimitNotice';
import { PillarRadarChart } from '@/components/ui/PillarRadarChart';
import { pillarColors } from '@/lib/design/pillarColors';
import { pillarOrder, pillarLabels } from '@/lib/assessment/pillars';
import type { Pillar } from '@/lib/assessment/pillars';
import type { Practice } from '@/lib/practices/library';
import { practicesById } from '@/lib/practices/library';
import {
  readLocalResult,
  clearLocalResult,
  ageInDays,
  STALE_AGE_DAYS,
} from '@/lib/assessment/localResult';
import { trackEvent } from '@/lib/analytics';

const MAX_SCORE = 5;

type ScoresByPillar = Record<Pillar, number>;

type AssessmentData = {
  scoresByPillar: ScoresByPillar
  focusPillar: Pillar
  lowestPillarId?: Pillar
}

type SuggestionsData = {
  suggestions: Practice[]
  focusPillar: Pillar | null
  lowestPillarId?: Pillar | null
}

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

type CardStatus = 'none' | 'active' | 'inactive'

type SwitchState = {
  newPractice: Practice
  currentActive: EnrichedPractice
} | null

export default function ResultsPage() {
  const router = useRouter()
  const { authStatus } = useAuthenticator((c) => [c.authStatus])
  const isAnonymous = authStatus !== 'authenticated'

  const [assessment, setAssessment] = useState<AssessmentData | null>(null)
  const [suggestions, setSuggestions] = useState<Practice[] | null>(null)
  const [active, setActive] = useState<ActiveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [staleDays, setStaleDays] = useState<number | null>(null)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [inlineError, setInlineError] = useState<Record<string, string>>({})
  const [capNotice, setCapNotice] = useState<Record<string, number>>({})
  const [switchState, setSwitchState] = useState<SwitchState>(null)

  const loadAuthed = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [assessRes, sugRes, activeRes] = await Promise.all([
        fetch('/api/assessment/latest'),
        fetch('/api/practices/suggestions'),
        fetch('/api/practices/active'),
      ])

      if (assessRes.ok) {
        const data = await assessRes.json() as AssessmentData
        setAssessment(data)
      }
      if (!sugRes.ok) throw new Error('Failed to load suggestions')
      const sugData = await sugRes.json() as SuggestionsData
      setSuggestions(sugData.suggestions)

      if (activeRes.ok) {
        setActive(await activeRes.json() as ActiveData)
      }
      setStaleDays(null)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAnonymous = useCallback(() => {
    setLoading(true)
    setError(false)
    const stored = readLocalResult()
    if (!stored) {
      router.replace('/assessment')
      return
    }
    setAssessment({
      scoresByPillar: stored.scoresByPillar,
      focusPillar: stored.focusPillar,
      lowestPillarId: stored.lowestPillarId,
    })
    const sugs = stored.suggestedPracticeIds
      .map((id) => practicesById.get(id))
      .filter((p): p is Practice => Boolean(p))
    setSuggestions(sugs)
    setActive(null)
    const age = ageInDays(stored.takenAt)
    setStaleDays(age >= STALE_AGE_DAYS ? Math.floor(age) : null)
    setLoading(false)
  }, [router])

  useEffect(() => {
    if (authStatus === 'configuring') return
    if (isAnonymous) {
      loadAnonymous()
    } else {
      loadAuthed()
    }
  }, [authStatus, isAnonymous, loadAuthed, loadAnonymous])

  // Fire `results_viewed` once we have an assessment loaded and know the
  // focus pillar. Effect deps include focusPillar so it fires exactly when
  // the data lands, not before.
  const focusPillarForTracking = assessment?.lowestPillarId ?? assessment?.focusPillar
  useEffect(() => {
    if (!focusPillarForTracking) return
    trackEvent('results_viewed', {
      is_anonymous: isAnonymous,
      focus_pillar: focusPillarForTracking,
    })
  }, [focusPillarForTracking, isAnonymous])

  const statusById = useMemo(() => {
    const map = new Map<string, CardStatus>()
    for (const p of active?.activePractices ?? []) map.set(p.id, 'active')
    for (const p of active?.inactivePractices ?? []) map.set(p.id, 'inactive')
    return map
  }, [active])

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
        await loadAuthed()
        router.push('/today')
        return
      }
      if (res.status === 409 && (json as { error?: string }).error === 'CAP_REACHED') {
        const isFree = (active?.subscriptionStatus ?? 'FREE').toUpperCase() !== 'PAID'
        if (isFree && active?.activePractices.length === 1) {
          setSwitchState({ newPractice: practice, currentActive: active.activePractices[0] })
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
      await loadAuthed()
      router.push('/today')
    } finally {
      setAction(newPractice.id, false)
    }
  }

  function handleAnonymousRetake() {
    clearLocalResult()
    router.replace('/assessment')
  }

  const scores = assessment?.scoresByPillar
  const focusPillar = assessment?.lowestPillarId ?? assessment?.focusPillar
  const focusPillarLabel = focusPillar ? pillarLabels[focusPillar] : null

  return (
    <StandardPage
      title="Your Insights"
      description="Where you stand across the 7 Friends pillars — and what to work on next."
    >
      <div className="space-y-10">

        {loading && <Loading text="Loading your insights…" />}
        {!loading && error && <ErrorState message="Couldn't load your insights." onRetry={() => window.location.reload()} />}

        {!loading && !error && !assessment && (
          <EmptyState
            title="No insights yet"
            text="Take the assessment to see your pillar results and get personalized practice suggestions."
            action={<Button asChild><Link href="/assessment">Start assessment →</Link></Button>}
          />
        )}

        {assessment && (
          <>
            {staleDays !== null && (
              <Card className="border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-foreground">
                    Your result is {staleDays} days old — things may have changed.
                  </p>
                  <Button variant="outline" size="sm" onClick={handleAnonymousRetake}>
                    Retake assessment
                  </Button>
                </div>
              </Card>
            )}

            <Card className="border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Focus Pillar</p>
                <HelpTooltip content="Your focus pillar is your lowest-scoring area. It's where small changes tend to have the biggest impact. You're not broken — you just have the most room to grow here." />
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="h-4 w-4 rounded-full shrink-0"
                  style={{ backgroundColor: pillarColors[focusPillar!] }}
                />
                <h2 className="text-xl font-semibold text-foreground">
                  {pillarLabels[focusPillar!]} Intelligence
                </h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                This is your lowest-scoring area. Starting here gives you the most room to grow.
              </p>
            </Card>

            <Card>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
                Pillar Strengths
              </p>
              <PillarRadarChart scores={scores!} focusPillar={focusPillar!} />
            </Card>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Your Results by Pillar</p>
                <HelpTooltip content="Each pillar has 5 questions. Your score reflects how many you answered Yes to in the last 7–14 days. A 3/5 isn't a failure — it's a starting point." />
              </div>
              <div className="space-y-3">
                {pillarOrder.map((pillar) => {
                  const score = scores![pillar] ?? 0;
                  const pct = Math.round((score / MAX_SCORE) * 100);
                  const isFocus = pillar === focusPillar;
                  const color = pillarColors[pillar];
                  return (
                    <div
                      key={pillar}
                      className={`rounded-xl p-4 border ${
                        isFocus ? 'border-primary/30 bg-primary/5' : 'border-border/60 bg-card'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm font-medium text-foreground flex-1">{pillarLabels[pillar]}</span>
                        <span className="text-xs text-muted-foreground">{score}/{MAX_SCORE}</span>
                        {isFocus && (
                          <span className="text-xs font-semibold text-primary">focus</span>
                        )}
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/60">
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
                Suggested Practices
              </p>
              {!suggestions && <Loading text="Finding the right practices for you…" />}
              {suggestions && (
                <div className="space-y-4">
                  {suggestions.map((practice) => {
                    const status: CardStatus = statusById.get(practice.id) ?? 'none'
                    const busy = !!actionLoading[practice.id]
                    return (
                      <Card key={practice.id} variant="interactive">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                                style={{ backgroundColor: pillarColors[practice.pillar] }}
                              >
                                {pillarLabels[practice.pillar]}
                              </span>
                              {!isAnonymous && status === 'active' && (
                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/30">
                                  Active
                                </span>
                              )}
                              {!isAnonymous && status === 'inactive' && (
                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground border border-border">
                                  Paused
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-foreground">{practice.title}</p>
                            <p className="text-sm text-muted-foreground">{practice.description}</p>
                            {!isAnonymous && status === 'inactive' && (
                              <p className="text-xs text-muted-foreground">
                                You started this before — currently paused. Resume anytime.
                              </p>
                            )}
                            {practice.rationale && (
                              <p className="text-xs text-muted-foreground border-l-2 border-border pl-3">
                                {practice.rationale}
                              </p>
                            )}
                          </div>
                          <div>
                            {isAnonymous ? (
                              <Button asChild variant="outline">
                                <Link
                                  href="/auth"
                                  onClick={() => trackEvent('signup_clicked', {
                                    focus_pillar: focusPillarForTracking,
                                    source: 'practice_card',
                                  })}
                                >
                                  Sign up to start →
                                </Link>
                              </Button>
                            ) : (
                              <>
                                {status === 'none' && (
                                  <Button variant="outline" disabled={busy} onClick={() => handleStart(practice)}>
                                    {busy ? '…' : 'Start this practice'}
                                  </Button>
                                )}
                                {status === 'inactive' && (
                                  <Button variant="outline" disabled={busy} onClick={() => handleStart(practice)}>
                                    {busy ? '…' : 'Resume'}
                                  </Button>
                                )}
                                {status === 'active' && (
                                  <Button asChild>
                                    <Link href="/today">View on Today</Link>
                                  </Button>
                                )}
                                {capNotice[practice.id] ? (
                                  <CapLimitNotice cap={capNotice[practice.id]} />
                                ) : inlineError[practice.id] ? (
                                  <p className="text-xs text-destructive mt-1">
                                    {inlineError[practice.id]}
                                  </p>
                                ) : null}
                              </>
                            )}
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
              <div className="pt-3">
                <Link
                  href="/practices"
                  className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Browse all 35 practices →
                </Link>
              </div>
            </div>

            {isAnonymous ? (
              <div className="pt-2 space-y-4">
                <Card className="border-primary/40 bg-primary/5">
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-primary">Save your results</p>
                    <p className="text-base text-foreground">
                      Sign up free to start your {focusPillarLabel} practice — we&apos;ll save your
                      results and set up a single daily check-in.
                    </p>
                    <Button asChild size="lg">
                      <Link
                        href="/auth"
                        onClick={() => trackEvent('signup_clicked', {
                          focus_pillar: focusPillarForTracking,
                          source: 'results_bottom',
                        })}
                      >
                        Sign up free →
                      </Link>
                    </Button>
                  </div>
                </Card>
                <div>
                  <button
                    type="button"
                    onClick={handleAnonymousRetake}
                    className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
                  >
                    Retake (clears your result)
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2 space-y-3">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/today">Go to Today →</Link>
                </Button>
                <div>
                  <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                    <Link href="/assessment">Retake assessment</Link>
                  </Button>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Your results update when you retake — useful after a few weeks of practice.{" "}
                    <Link href="/faq" className="underline underline-offset-2 hover:text-foreground">Questions about your results?</Link>
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {switchState && (
        <SwitchDialog
          newPracticeTitle={switchState.newPractice.title}
          currentActiveTitle={switchState.currentActive.title}
          loading={!!actionLoading[switchState.newPractice.id]}
          onConfirm={handleSwitchConfirm}
          onCancel={() => setSwitchState(null)}
        />
      )}
    </StandardPage>
  );
}

function SwitchDialog({
  newPracticeTitle,
  currentActiveTitle,
  loading,
  onConfirm,
  onCancel,
}: {
  newPracticeTitle: string
  currentActiveTitle: string
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
          Switch to &ldquo;{newPracticeTitle}&rdquo;?
        </p>
        <p className="text-sm text-muted-foreground">
          &ldquo;{currentActiveTitle}&rdquo; will be paused. You can resume it anytime.
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
