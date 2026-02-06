'use client';

import { ListDetailPage } from '@/components/layout';
import { PageCard } from '@/components/layout';

export default function PracticesPage() {
  return (
    <ListDetailPage
      title="Practices"
      description="Browse and start guided practices."
      metaLabel="LIBRARY"
      list={
        <PageCard>
          <div className="text-sm text-muted-foreground">
            Placeholder list. This will show practice categories and items.
          </div>
        </PageCard>
      }
      detail={
        <PageCard>
          <div className="text-sm text-muted-foreground">
            Placeholder detail. This will show the selected practice details.
          </div>
        </PageCard>
      }
    />
  );
}
