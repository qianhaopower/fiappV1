'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StandardPage } from '@/components/layout';
import { Card, Button, Loading, ErrorState } from '@/components/ui';
import { PillarRadarChart } from '@/components/ui/PillarRadarChart';
import { pillarColors } from '@/lib/design/pillarColors';
import { pillarOrder } from '@/lib/assessment/pillars';
import type { Pillar } from '@/lib/assessment/pillars';
import type { Practice } from '@/lib/practices/library';
import {
  MOCK_PILLAR_SCORES,
  MOCK_FOCUS_PILLAR,
  MOCK_PILLAR_LABELS,
} from '@/lib/mockState';

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
  const [assessment, setAssessment] = useState<AssessmentData | null>(null)
  const [suggestions, setSuggestions] = useState<Practice[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

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
        // 404 = no assessment yet — fall through to mock scores

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

  const scores = assessment?.scoresByPillar ?? MOCK_PILLAR_SCORES
  const focusPillar = assessment?.focusPillar ?? MOCK_FOCUS_PILLAR

  return (
    <StandardPage
      title="Your Results"
      description="Here's where you stand across the 7 F.R.I.E.N.D.S pillars."
      metaLabel="RESULTS"
    >
      <div className="space-y-10">
        {/* Focus pillar highlight */}
        <Card className="border-primary/30 bg-primary/5">
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Focus Pillar</p>
          <div className="flex items-center gap-3">
            <span
              className="h-4 w-4 rounded-full shrink-0"
              style={{ backgroundColor: pillarColors[focusPillar] }}
            />
            <h2 className="text-2xl font-bold text-foreground">
              {MOCK_PILLAR_LABELS[focusPillar]} Intelligence
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
          <PillarRadarChart scores={scores} focusPillar={focusPillar} />
        </Card>

        {/* All pillar scores */}
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">All Pillars</p>
          <div className="space-y-3">
            {pillarOrder.map((pillar) => {
              const score = scores[pillar] ?? 0;
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
                    {MOCK_PILLAR_LABELS[pillar]}
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

          {loading && <Loading text="Finding the right practices for you…" />}

          {!loading && error && (
            <ErrorState
              message="Couldn't load suggestions."
              onRetry={() => window.location.reload()}
            />
          )}

          {!loading && !error && suggestions && (
            <div className="space-y-4">
              {suggestions.map((practice) => (
                <Card key={practice.id} variant="interactive">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 min-w-0">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                        style={{ backgroundColor: pillarColors[practice.pillar] }}
                      >
                        {MOCK_PILLAR_LABELS[practice.pillar]}
                      </span>
                      <p className="font-semibold text-foreground">{practice.title}</p>
                      <p className="text-sm text-muted-foreground">{practice.description}</p>
                      <p className="text-xs text-muted-foreground italic">
                        Why: {practice.rationale}
                      </p>
                    </div>
                    {/* TODO E5: wire to trial activation API */}
                    <Button size="sm" variant="outline" className="shrink-0" asChild>
                      <Link href="/practices">Try this</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="pt-2">
          <Button asChild size="lg">
            <Link href="/practices">Go to Active Practices →</Link>
          </Button>
        </div>
      </div>
    </StandardPage>
  );
}
