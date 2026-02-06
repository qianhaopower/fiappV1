'use client';

import { NarrowFormPage } from '@/components/layout';
import { PageCard } from '@/components/layout';

export default function AssessmentPage() {
  return (
    <NarrowFormPage
      title="Assessment"
      description="Start or review your wellbeing assessment."
      metaLabel="ASSESSMENT"
    >
      <PageCard>
        <div className="text-sm text-muted-foreground">
          Placeholder content. This will guide the user through assessment steps.
        </div>
      </PageCard>
    </NarrowFormPage>
  );
}
