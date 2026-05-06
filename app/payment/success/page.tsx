"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PaymentSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.replace("/practices"), 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-bg font-sans text-ink antialiased flex items-center justify-center px-6">
      <div className="max-w-[26rem] text-center">
        <div className="mb-6 inline-grid h-16 w-16 place-items-center rounded-full bg-primary-soft">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-ink" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1 className="mb-3 text-[1.6rem] font-medium tracking-[-0.02em]">
          You&apos;re on Plus plan.
        </h1>
        <p className="mb-8 text-ink-2">
          You can now track up to 10 active practices. Redirecting you to your practices now.
        </p>
        <Link
          href="/practices"
          className="inline-flex h-11 items-center gap-2 rounded-[0.5rem] bg-primary px-5 text-[0.95rem] font-medium text-white no-underline transition-colors hover:bg-[oklch(0.5_0.22_260)]"
        >
          Go to practices →
        </Link>
      </div>
    </div>
  );
}
