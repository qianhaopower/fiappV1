'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { HelpTooltip } from '@/components/HelpTooltip';
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

            {/* Radar chart */}
            <Card>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
                Pillar Strengths
              </p>
              <PillarRadarChart scores={scores!} focusPillar={focusPillar!} />
            </Card>

            {/* All pillar scores */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">All Pillars</p>
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
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                            style={{ backgroundColor: pillarColors[practice.pillar] }}
                          >
                            {pillarLabels[practice.pillar]}
                          </span>
                          <p className="font-semibold text-foreground">{practice.title}</p>
                          <p className="text-sm text-muted-foreground">{practice.description}</p>
                          {practice.rationale && (
                            <p className="text-xs text-muted-foreground border-l-2 border-border pl-3">
                              {practice.rationale}
                            </p>
                          )}
                        </div>
                        <div>
                          <Button
                            variant="outline"
                            disabled={!!trialLoading[practice.id]}
                            onClick={() => handleTryThis(practice.id)}
                          >
                            {trialLoading[practice.id] ? '…' : 'Try this practice'}
                          </Button>
                          {trialError[practice.id] && (
                            <p className="text-xs text-destructive mt-1">
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
            <div className="pt-2 space-y-3">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/practices">Go to My Practices →</Link>
              </Button>
              <div>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                  <Link href="/assessment">Retake assessment</Link>
                </Button>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Scores update when you retake — useful after a few weeks of practice.{" "}
                  <Link href="/faq" className="underline underline-offset-2 hover:text-foreground">Questions about your scores?</Link>
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </StandardPage>
  );
}
