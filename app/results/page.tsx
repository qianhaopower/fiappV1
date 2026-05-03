'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StandardPage } from '@/components/layout';
import { Card, Button, Loading, ErrorState, EmptyState } from '@/components/ui';
import { PillarRadarChart } from '@/components/ui/PillarRadarChart';
import { pillarColors } from '@/lib/design/pillarColors';
import { pillarOrder, pillarLabels } from '@/lib/assessment/pillars';
import type { Pillar } from '@/lib/assessment/pillars';
import type { Practice } from '@/lib/practices/library';

const MAX_SCORE = 5;

type ScoresByPillar = Record<Pillar, number>;

type AssessmentData = {
  scoresByPillar: ScoresByPillar
  focusPillar: Pillar
}

type SuggestionsData = {
  suggestions: Practice[]
  focusPillar: Pillar | null
}

export default function ResultsPage() {
  const router = useRouter()
  const [assessment, setAssessment] = useState<AssessmentData | null>(null)
  const [suggestions, setSuggestions] = useState<Practice[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [trialLoading, setTrialLoading] = useState<Record<string, boolean>>({})
  const [trialError, setTrialError] = useState<Record<string, string>>({})

  const handleTryThis = useCallback(async (practiceId: string) => {
    setTrialLoading((prev) => ({ ...prev, [practiceId]: true }))
    setTrialError((prev) => ({ ...prev, [practiceId]: '' }))
    try {
      const res = await fetch('/api/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'startTrial', practiceId }),
      })
      if (res.ok || res.status === 409) {
        const data = await res.json()
        if (res.ok || data.error === 'ALREADY_TRIALING' || data.error === 'ALREADY_ACTIVE') {
          router.push('/practices')
          return
        }
        const msg = data.error === 'TRIAL_LIMIT_REACHED'
          ? 'You already have an active trial. Promote or discard it first.'
          : 'Could not start trial. Please try again.'
        setTrialError((prev) => ({ ...prev, [practiceId]: msg }))
      } else {
        setTrialError((prev) => ({ ...prev, [practiceId]: 'Could not start trial. Please try again.' }))
      }
    } catch {
      setTrialError((prev) => ({ ...prev, [practiceId]: 'Could not start trial. Please try again.' }))
    } finally {
      setTrialLoading((prev) => ({ ...prev, [practiceId]: false }))
    }
  }, [router])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(false)
      try {
        const [assessRes, sugRes] = await Promise.all([
          fetch('/api/assessment/latest'),
          fetch('/api/practices/suggestions'),
        ])

        if (assessRes.ok) {
          const data = await assessRes.json() as AssessmentData
          setAssessment(data)
        }
        // 404 = no assessment yet — assessment stays null

        if (!sugRes.ok) throw new Error('Failed to load suggestions')
        const sugData = await sugRes.json() as SuggestionsData
        setSuggestions(sugData.suggestions)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const scores = assessment?.scoresByPillar
  const focusPillar = assessment?.focusPillar

  return (
    <StandardPage
      title="Your Insights"
      description="Where you stand across the 7 Friends pillars — and what to work on next."
      metaLabel="INSIGHTS"
      actions={assessment ? (
        <Button variant="ghost" size="sm" asChild>
          <Link href="/assessment">Retake assessment</Link>
        </Button>
      ) : undefined}
    >
      <div className="space-y-10">

        {loading && <Loading text="Loading your insights…" />}
        {!loading && error && <ErrorState message="Couldn't load your insights." onRetry={() => window.location.reload()} />}

        {!loading && !error && !assessment && (
          <EmptyState
            title="No insights yet"
            text="Take the assessment to see your pillar scores and get personalized practice suggestions."
            action={<Button asChild><Link href="/assessment">Start assessment →</Link></Button>}
          />
        )}

        {assessment && (
          <>
            {/* Focus pillar highlight */}
            <Card className="border-primary/30 bg-primary/5">
              <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Focus Pillar</p>
              <div className="flex items-center gap-3">
                <span
                  className="h-4 w-4 rounded-full shrink-0"
                  style={{ backgroundColor: pillarColors[focusPillar!] }}
                />
                <h2 className="text-2xl font-bold text-foreground">
                  {pillarLabels[focusPillar!]} Intelligence
                </h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                This is your lowest-scoring area. Starting here gives you the most room to grow.
              </p>
            </Card>

            {/* Radar chart */}
            <Card>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
                Pillar Strengths
              </p>
              <PillarRadarChart scores={scores!} focusPillar={focusPillar!} />
            </Card>

            {/* All pillar scores */}
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">All Pillars</p>
              <div className="space-y-3">
                {pillarOrder.map((pillar) => {
                  const score = scores![pillar] ?? 0;
                  const pct = Math.round((score / MAX_SCORE) * 100);
                  const isFocus = pillar === focusPillar;
                  const color = pillarColors[pillar];
                  return (
                    <div
                      key={pillar}
                      className={`flex items-center gap-4 rounded-xl p-4 border ${
                        isFocus ? 'border-primary/30 bg-primary/5' : 'border-border/60 bg-card'
                      }`}
                    >
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="w-28 text-sm font-medium text-foreground shrink-0">
                        {pillarLabels[pillar]}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-muted/60">
                        <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                      <span className="w-10 text-right text-sm text-muted-foreground shrink-0">
                        {score}/{MAX_SCORE}
                      </span>
                      {isFocus && (
                        <span className="text-xs font-semibold text-primary shrink-0">focus</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Suggested practices */}
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
                Suggested Practices
              </p>
              {!suggestions && <Loading text="Finding the right practices for you…" />}
              {suggestions && (
                <div className="space-y-4">
                  {suggestions.map((practice) => (
                    <Card key={practice.id} variant="interactive">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 min-w-0">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                            style={{ backgroundColor: pillarColors[practice.pillar] }}
                          >
                            {pillarLabels[practice.pillar]}
                          </span>
                          <p className="font-semibold text-foreground">{practice.title}</p>
                          <p className="text-sm text-muted-foreground">{practice.description}</p>
                          <p className="text-xs text-muted-foreground italic">
                            Why: {practice.rationale}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!!trialLoading[practice.id]}
                            onClick={() => handleTryThis(practice.id)}
                          >
                            {trialLoading[practice.id] ? '…' : 'Try this'}
                          </Button>
                          {trialError[practice.id] && (
                            <p className="text-[11px] text-destructive text-right max-w-[140px]">
                              {trialError[practice.id]}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="pt-2">
              <Button asChild size="lg">
                <Link href="/practices">Go to My Practices →</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </StandardPage>
  );
}
