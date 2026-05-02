'use client';

import Link from 'next/link';
import { StandardPage } from '@/components/layout';
import { Card, Button, EmptyState } from '@/components/ui';
import { pillarColors } from '@/lib/design/pillarColors';
import {
  MOCK_ACTIVE_PRACTICES,
  MOCK_TRIALS,
  MOCK_PILLAR_LABELS,
} from '@/lib/mockState';
import type { Pillar } from '@/lib/assessment/pillars';

function PillarBadge({ pillar }: { pillar: Pillar }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
      style={{ backgroundColor: pillarColors[pillar] }}
    >
      {MOCK_PILLAR_LABELS[pillar]}
    </span>
  );
}

export default function PracticesPage() {
  return (
    <StandardPage
      title="Active Practices"
      description="Manage your practices and trials."
      metaLabel="PRACTICES"
      actions={
        <Button variant="outline" size="sm">
          + Add practice
        </Button>
      }
    >
      <div className="space-y-10">
        {/* Active practices */}
        <section>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Active</p>
          {MOCK_ACTIVE_PRACTICES.length === 0 ? (
            <EmptyState
              title="No active practices"
              text="Start a practice or promote a trial to get going."
              action={<Button variant="outline">Browse suggestions</Button>}
            />
          ) : (
            <div className="space-y-3">
              {MOCK_ACTIVE_PRACTICES.map((p) => (
                <Card key={p.id} variant="interactive" className="flex items-start justify-between gap-4">
                  <div className="space-y-2 min-w-0">
                    <PillarBadge pillar={p.pillar} />
                    <p className="font-semibold text-foreground">{p.title}</p>
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button size="sm" variant="outline">Set focus</Button>
                    <Button size="sm" variant="ghost">Pause</Button>
                    <Button size="sm" variant="ghost">Replace</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Trials */}
        <section>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Trials</p>
          {MOCK_TRIALS.length === 0 ? (
            <EmptyState
              title="No active trials"
              text="Try a practice for a few days before committing."
            />
          ) : (
            <div className="space-y-3">
              {MOCK_TRIALS.map((t) => (
                <Card key={t.id} variant="interactive" className="flex items-start justify-between gap-4">
                  <div className="space-y-2 min-w-0">
                    <PillarBadge pillar={t.pillar} />
                    <p className="font-semibold text-foreground">{t.title}</p>
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                    <p className="text-xs text-muted-foreground">{t.daysLeft} days left in trial</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button size="sm" variant="default">Promote</Button>
                    <Button size="sm" variant="ghost">Discard</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* CTA */}
        <div className="pt-2">
          <Button asChild>
            <Link href="/today">Go to Today →</Link>
          </Button>
        </div>
      </div>
    </StandardPage>
  );
}
