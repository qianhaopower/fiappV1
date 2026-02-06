'use client';

import { StandardPage } from '@/components/layout';
import { PageCard } from '@/components/layout';

export default function TodayPage() {
  return (
    <StandardPage
      title="Today"
      description="Your daily wellbeing check-in and focus."
      metaLabel="OVERVIEW"
    >
      <PageCard>
        <div className="text-sm text-muted-foreground">
          Placeholder content. This page will host your daily summary, next practice, and mood check-in.
        </div>
      </PageCard>
    </StandardPage>
  );
}
