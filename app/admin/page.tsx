'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { pillarLabels } from '@/lib/assessment/pillars'
import { pillarColors } from '@/lib/design/pillarColors'
import type { MetricsTotals, MetricsDaily } from '@/utils/metricsClient'
import type { Pillar } from '@/lib/assessment/pillars'

type MetricsResponse = {
  totals: MetricsTotals
  daily: MetricsDaily[]
}

const PILLARS: Pillar[] = ['financial', 'relationship', 'information', 'emotional', 'nutrition', 'dynamic', 'sleep']

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-1">{label}</p>
      <p className="text-3xl font-semibold text-foreground">{value}</p>
    </div>
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="h-1.5 w-full rounded-full bg-muted/50">
      <div
        className="h-1.5 rounded-full"
        style={{ width: `${pct}%`, backgroundColor: color ?? 'hsl(var(--primary))' }}
      />
    </div>
  )
}

export default function AdminPage() {
  const [data, setData] = useState<MetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/metrics')
      .then((r) => {
        if (r.status === 403) throw new Error('forbidden')
        if (!r.ok) throw new Error('failed')
        return r.json() as Promise<MetricsResponse>
      })
      .then(setData)
      .catch((e) => setError(e.message === 'forbidden' ? 'Access denied.' : 'Failed to load metrics.'))
      .finally(() => setLoading(false))
  }, [])

  const t = data?.totals ?? {}
  const daily = data?.daily ?? []

  const maxReturns = Math.max(...daily.map((d) => d.returns ?? 0), 1)
  const maxAssessments = Math.max(...daily.map((d) => d.assessments ?? 0), 1)

  const pillarMax = Math.max(
    ...PILLARS.map((p) => (t[`pillarFocus_${p}` as keyof MetricsTotals] as number | undefined) ?? 0),
    1
  )

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-card/95 backdrop-blur px-6">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Operator Dashboard</p>
          <Link href="/today" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Back to app
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-10">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {data && (
          <>
            {/* Funnel */}
            <section>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Funnel — all time</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard label="Users" value={t.totalUsers ?? 0} />
                <StatCard label="Assessments" value={t.totalAssessments ?? 0} />
                <StatCard label="Trials started" value={t.totalTrials ?? 0} />
                <StatCard label="Trials promoted" value={t.totalPromotions ?? 0} />
                <StatCard label="Returns logged" value={t.totalReturns ?? 0} />
              </div>
              {(t.totalUsers ?? 0) > 0 && (
                <div className="mt-4 rounded-xl border border-border/40 bg-muted/30 p-4 text-xs text-muted-foreground space-y-1.5">
                  <p>Assessment rate: <span className="font-medium text-foreground">{Math.round(((t.totalAssessments ?? 0) / (t.totalUsers ?? 1)) * 100)}%</span> of users completed assessment</p>
                  <p>Trial rate: <span className="font-medium text-foreground">{Math.round(((t.totalTrials ?? 0) / Math.max(t.totalAssessments ?? 1, 1)) * 100)}%</span> of assessments led to a trial</p>
                  <p>Promotion rate: <span className="font-medium text-foreground">{Math.round(((t.totalPromotions ?? 0) / Math.max(t.totalTrials ?? 1, 1)) * 100)}%</span> of trials were promoted</p>
                </div>
              )}
            </section>

            {/* Daily returns — last 30 days */}
            <section>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Daily returns — last 30 days</p>
              <div className="rounded-xl border border-border/60 bg-card p-5">
                <div className="flex items-end gap-1 h-24">
                  {daily.map((d) => {
                    const h = maxReturns > 0 ? Math.round(((d.returns ?? 0) / maxReturns) * 100) : 0
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${d.date}: ${d.returns ?? 0} returns`}>
                        <div
                          className="w-full rounded-sm"
                          style={{ height: `${Math.max(h, 2)}%`, backgroundColor: 'hsl(var(--primary))', opacity: h === 0 ? 0.15 : 0.85 }}
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                  <span>{daily[0]?.date}</span>
                  <span>{daily[daily.length - 1]?.date}</span>
                </div>
              </div>
            </section>

            {/* Daily assessments — last 30 days */}
            <section>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Daily assessments — last 30 days</p>
              <div className="rounded-xl border border-border/60 bg-card p-5">
                <div className="flex items-end gap-1 h-16">
                  {daily.map((d) => {
                    const h = maxAssessments > 0 ? Math.round(((d.assessments ?? 0) / maxAssessments) * 100) : 0
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center justify-end" title={`${d.date}: ${d.assessments ?? 0} assessments`}>
                        <div
                          className="w-full rounded-sm"
                          style={{ height: `${Math.max(h, 2)}%`, backgroundColor: 'hsl(var(--secondary))', opacity: h === 0 ? 0.15 : 0.85 }}
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                  <span>{daily[0]?.date}</span>
                  <span>{daily[daily.length - 1]?.date}</span>
                </div>
              </div>
            </section>

            {/* Pillar focus distribution */}
            <section>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Focus pillar distribution — all time</p>
              <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
                {PILLARS.map((p) => {
                  const count = (t[`pillarFocus_${p}` as keyof MetricsTotals] as number | undefined) ?? 0
                  return (
                    <div key={p}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-foreground">{pillarLabels[p]}</span>
                        <span className="text-xs text-muted-foreground">{count}</span>
                      </div>
                      <MiniBar value={count} max={pillarMax} color={pillarColors[p]} />
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Last updated */}
            {t.updatedAt && (
              <p className="text-xs text-muted-foreground">Last updated: {new Date(t.updatedAt).toLocaleString()}</p>
            )}
          </>
        )}
      </main>
    </div>
  )
}
