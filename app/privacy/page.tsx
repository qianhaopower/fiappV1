import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy — Friends Intelligence",
};

export default function PrivacyPage() {
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
        <p className="mb-3 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ink-3">Privacy</p>
        <h1 className="mb-4 text-[clamp(1.8rem,3vw,2.4rem)] font-medium leading-[1.1] tracking-[-0.02em]">
          Privacy Policy
        </h1>
        <p className="mb-12 text-ink-2">Last updated: May 2026</p>

        <div className="grid gap-8 text-[0.95rem] leading-[1.7] text-ink-2">
          <section>
            <h2 className="mb-3 text-base font-medium text-ink">What we collect</h2>
            <p>We collect your email address when you create an account, and the answers you provide in the assessment. We also store your practice activity (check-ins, pauses, completions) so we can show you your progress.</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-medium text-ink">How we store it</h2>
            <p>Your data is stored on AWS (Amazon Web Services) in the Asia Pacific (Sydney) region. We do not store payment card details — payments are handled by a third-party processor.</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-medium text-ink">What we don&apos;t do</h2>
            <p>We do not sell your data. We do not share it with advertisers. We do not use it to train AI models. Your wellbeing data stays yours.</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-medium text-ink">Your rights</h2>
            <p>You can request a copy of your data or ask us to delete your account at any time by emailing us. We will action deletion requests within 30 days.</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-medium text-ink">Contact</h2>
            <p>Questions about this policy? Email <a href="mailto:hello@friendsintelligence.net" className="text-primary no-underline hover:underline">hello@friendsintelligence.net</a></p>
          </section>
        </div>
      </main>
    </div>
  );
}
