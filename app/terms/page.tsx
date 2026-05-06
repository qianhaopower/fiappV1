import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms — Friends Intelligence",
};

export default function TermsPage() {
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
        <p className="mb-3 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ink-3">Terms</p>
        <h1 className="mb-4 text-[clamp(1.8rem,3vw,2.4rem)] font-medium leading-[1.1] tracking-[-0.02em]">
          Terms of Use
        </h1>
        <p className="mb-12 text-ink-2">Last updated: May 2026</p>

        <div className="grid gap-8 text-[0.95rem] leading-[1.7] text-ink-2">
          <section>
            <h2 className="mb-3 text-base font-medium text-ink">Intellectual property</h2>
            <p>Friends Intelligence, the FRIENDS framework, all assessment content, pillar descriptions, and practice recommendations are the intellectual property of Friends Intelligence. All rights reserved. You may not reproduce or distribute any part of this product without written permission.</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-medium text-ink">Your account</h2>
            <p>You are responsible for keeping your account credentials secure. You may not share your account or use it on behalf of others. We reserve the right to suspend or terminate accounts that violate these terms.</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-medium text-ink">Not medical advice</h2>
            <p>Friends Intelligence is a personal development tool, not a medical or clinical service. Nothing in the app constitutes medical, psychological, or nutritional advice. Always consult a qualified professional for health decisions.</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-medium text-ink">Limitation of liability</h2>
            <p>We provide this service as-is. To the fullest extent permitted by law, Friends Intelligence is not liable for any indirect, incidental, or consequential damages arising from your use of the app.</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-medium text-ink">Changes</h2>
            <p>We may update these terms from time to time. Continued use of the app after changes constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-medium text-ink">Contact</h2>
            <p>Questions? Email <a href="mailto:hello@friendsintelligence.net" className="text-primary no-underline hover:underline">hello@friendsintelligence.net</a></p>
          </section>
        </div>
      </main>
    </div>
  );
}
