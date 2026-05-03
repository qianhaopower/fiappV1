import Link from 'next/link';
import { Button } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm max-w-sm w-full">
        <p className="text-base font-semibold text-foreground">Page not found</p>
        <p className="mt-2 text-sm text-muted-foreground">
          This page doesn&apos;t exist or has moved.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
