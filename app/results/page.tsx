'use client';

import Link from 'next/link';
import { StandardPage } from '@/components/layout';
import { Card, Button } from '@/components/ui';
import { pillarColors } from '@/lib/design/pillarColors';
import { pillarOrder } from '@/lib/assessment/pillars';
import {
  MOCK_PILLAR_SCORES,
  MOCK_FOCUS_PILLAR,
  MOCK_PILLAR_LABELS,
} from '@/lib/mockState';

const MAX_SCORE = 5;

export default function ResultsPage() {
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
              style={{ backgroundColor: pillarColors[MOCK_FOCUS_PILLAR] }}
            />
            <h2 className="text-2xl font-bold text-foreground">
              {MOCK_PILLAR_LABELS[MOCK_FOCUS_PILLAR]} Intelligence
            </h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            This is your lowest-scoring area. Starting here gives you the most room to grow.
          </p>
        </Card>

        {/* All pillar scores */}
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">All Pillars</p>
          <div className="space-y-3">
            {pillarOrder.map((pillar) => {
              const score = MOCK_PILLAR_SCORES[pillar];
              const pct = Math.round((score / MAX_SCORE) * 100);
              const isFocus = pillar === MOCK_FOCUS_PILLAR;
              const color = pillarColors[pillar];
              return (
                <div
                  key={pillar}
                  className={`flex items-center gap-4 rounded-xl p-4 border ${
                    isFocus ? 'border-primary/30 bg-primary/5' : 'border-border/60 bg-card'
                  }`}
                >
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="w-28 text-sm font-medium text-foreground shrink-0">
                    {MOCK_PILLAR_LABELS[pillar]}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-muted/60">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
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

        {/* Suggested practices placeholder */}
        <Card variant="subtle">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Suggested Practices</p>
          <p className="text-sm text-muted-foreground">
            Based on your focus pillar, personalised practice suggestions will appear here.
          </p>
        </Card>

        {/* CTA */}
        <div className="pt-2">
          <Button asChild size="lg">
            <Link href="/practices">Choose your first practice →</Link>
          </Button>
        </div>
      </div>
    </StandardPage>
  );
}
