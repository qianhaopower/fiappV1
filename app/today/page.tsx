'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { NarrowFormPage } from '@/components/layout';
import { Card, Button, Loading, ErrorState } from '@/components/ui';
import { pillarColors } from '@/lib/design/pillarColors';
import { MOCK_RETURN_DOTS, MOCK_PILLAR_LABELS } from '@/lib/mockState';
import { practicesById } from '@/lib/practices/library';
import type { Practice } from '@/lib/practices/library';

type ActiveData = {
  todayFocusPracticeId: string | null
}

export default function TodayPage() {
  const [focusPractice, setFocusPractice] = useState<Practice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [todayStatus, setTodayStatus] = useState<'did-it' | 'not-today' | null>(null)

  useEffect(() => {
    fetch('/api/practices/active')
      .then((res) => {
        if (!res.ok) throw new Error('Failed')
        return res.json() as Promise<ActiveData>
      })
      .then((data) => {
        const practice = data.todayFocusPracticeId
          ? practicesById.get(data.todayFocusPracticeId) ?? null
          : null
        setFocusPractice(practice)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <NarrowFormPage title="Today" description="Your daily check-in." metaLabel="OVERVIEW">
      <div className="space-y-6">

        {loading && <Loading text="Loading today's practice…" />}

        {!loading && error && (
          <ErrorState message="Couldn't load today's practice." onRetry={() => window.location.reload()} />
        )}

        {!loading && !error && !focusPractice && (
          <Card>
            <p className="text-sm text-muted-foreground">
              No focus practice set yet.{' '}
              <Link href="/practices" className="text-primary underline underline-offset-2">
                Set one from your practices →
              </Link>
            </p>
          </Card>
        )}

        {!loading && !error && focusPractice && (
          <>
            {/* Focus practice card */}
            <Card>
              <div className="space-y-4">
                <div>
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                    style={{ backgroundColor: pillarColors[focusPractice.pillar] }}
                  >
                    {MOCK_PILLAR_LABELS[focusPractice.pillar]}
                  </span>
                  <p className="mt-3 text-xl font-semibold text-foreground">{focusPractice.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{focusPractice.description}</p>
                </div>

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
          </>
        )}

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
