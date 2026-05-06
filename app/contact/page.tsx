import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — Friends Intelligence",
};

export default function ContactPage() {
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
        <p className="mb-3 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ink-3">Contact</p>
        <h1 className="mb-4 text-[clamp(1.8rem,3vw,2.4rem)] font-medium leading-[1.1] tracking-[-0.02em]">
          Get in touch
        </h1>
        <p className="mb-10 text-ink-2">
          Questions, feedback, or data requests — we read every email.
        </p>

        <a
          href="mailto:hello@friendsintelligence.net"
          className="inline-flex h-12 items-center gap-2 rounded-[0.5rem] bg-primary px-5 text-[0.95rem] font-medium text-white no-underline transition-colors hover:bg-[oklch(0.5_0.22_260)]"
        >
          hello@friendsintelligence.net
        </a>
      </main>
    </div>
  );
}
