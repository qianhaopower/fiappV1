'use client';

import { DashboardPage } from '@/components/layout';
import { PageCard } from '@/components/layout';

export default function ProgressPage() {
  return (
    <DashboardPage
      title="Progress"
      description="Track your growth over time."
      metaLabel="INSIGHTS"
      summary={
        <PageCard>
          <div className="text-sm text-muted-foreground">
            Placeholder summary. This will show highlights and streaks.
          </div>
        </PageCard>
      }
      main={
        <PageCard>
          <div className="text-sm text-muted-foreground">
            Placeholder main panel. This will show charts and trends.
          </div>
        </PageCard>
      }
    />
  );
}
