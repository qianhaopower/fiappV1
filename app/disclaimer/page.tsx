import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclaimer — Friends Intelligence",
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-bg font-sans text-ink antialiased">
      <header className="border-b border-line-2 px-6">
        <div className="mx-auto flex h-16 max-w-[70rem] items-center justify-between">
          <Link href="/" className="text-[0.95rem] font-semibold text-ink no-underline hover:text-ink-2">
            ← Friends Intelligence
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[42rem] px-6 py-16 sm:py-24">
        <p className="mb-3 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ink-3">Disclaimer</p>
        <h1 className="mb-4 text-[clamp(1.8rem,3vw,2.4rem)] font-medium leading-[1.1] tracking-[-0.02em]">
          Not professional advice
        </h1>
        <p className="mb-12 text-ink-2">Last updated: May 2026</p>

        <div className="grid gap-8 text-[0.95rem] leading-[1.7] text-ink-2">
          <section>
            <h2 className="mb-3 text-base font-medium text-ink">What Friends Intelligence is</h2>
            <p>Friends Intelligence is a personal reflection and habit-building tool based on the F.R.I.E.N.D.S Intelligence framework. It is designed to help you notice patterns in your own life and build small, consistent practices across the areas that matter to you.</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-medium text-ink">What it is not</h2>
            <p>Friends Intelligence is <strong className="font-medium text-ink">not</strong> a substitute for professional advice of any kind. Nothing in this app constitutes or should be interpreted as:</p>
            <ul className="mt-3 list-disc pl-5 space-y-1.5">
              <li>Medical or clinical advice</li>
              <li>Mental health or psychological therapy</li>
              <li>Financial, legal, or investment advice</li>
              <li>Nutritional or dietary advice from a qualified professional</li>
              <li>Crisis intervention or emergency support</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-medium text-ink">If you need professional help</h2>
            <p>If you are experiencing a mental health crisis, medical emergency, or any situation requiring professional support, please contact a qualified professional or emergency service in your country. The app is not monitored and cannot provide real-time help.</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-medium text-ink">Assessment results</h2>
            <p>The assessment in Friends Intelligence is a self-reflection tool, not a diagnostic instrument. Results reflect your own responses at a point in time and are intended to help you identify where to direct your attention — not to diagnose, classify, or evaluate you.</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-medium text-ink">Contact</h2>
            <p>Questions about this disclaimer? Email <a href="mailto:hello@friendsintelligence.net" className="text-primary no-underline hover:underline">hello@friendsintelligence.net</a></p>
          </section>
        </div>
      </main>
    </div>
  );
}
