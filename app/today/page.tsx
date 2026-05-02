'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NarrowFormPage } from '@/components/layout';
import { Card, Button } from '@/components/ui';
import { pillarColors } from '@/lib/design/pillarColors';
import {
  MOCK_FOCUS_PRACTICE,
  MOCK_PILLAR_LABELS,
  MOCK_RETURN_DOTS,
} from '@/lib/mockState';

export default function TodayPage() {
  const [todayStatus, setTodayStatus] = useState<'did-it' | 'not-today' | null>(null);
  const practice = MOCK_FOCUS_PRACTICE;
  const color = pillarColors[practice.pillar];

  return (
    <NarrowFormPage title="Today" description="Your daily check-in." metaLabel="OVERVIEW">
      <div className="space-y-6">
        {/* Focus practice card */}
        <Card>
          <div className="space-y-4">
            <div>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                style={{ backgroundColor: color }}
              >
                {MOCK_PILLAR_LABELS[practice.pillar]}
              </span>
              <p className="mt-3 text-xl font-semibold text-foreground">{practice.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{practice.description}</p>
            </div>

            {/* Did it / Not today */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant={todayStatus === 'did-it' ? 'default' : 'outline'}
                onClick={() => setTodayStatus('did-it')}
              >
                ✓ Did it
              </Button>
              <Button
                variant={todayStatus === 'not-today' ? 'secondary' : 'outline'}
                onClick={() => setTodayStatus('not-today')}
              >
                Not today
              </Button>
            </div>

            {todayStatus && (
              <p className="text-sm text-center text-muted-foreground">
                {todayStatus === 'did-it'
                  ? 'Nice work. Keep it up tomorrow.'
                  : 'No worries. Tomorrow is a fresh start.'}
              </p>
            )}
          </div>
        </Card>

        {/* Recent days dots */}
        <Card variant="subtle">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Last 14 days</p>
          <div className="flex flex-wrap gap-2">
            {MOCK_RETURN_DOTS.map((dot, i) => (
              <span
                key={i}
                className={`h-6 w-6 rounded-full border ${
                  dot === true
                    ? 'bg-primary border-primary'
                    : dot === false
                    ? 'bg-muted border-border'
                    : 'bg-transparent border-border/40'
                }`}
              />
            ))}
          </div>
        </Card>

        {/* Navigation */}
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
