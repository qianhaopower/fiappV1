import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import LandingAuthRedirect from "@/components/LandingAuthRedirect";

export const metadata: Metadata = {
  title: "Friends Intelligence — A life operating system for better decisions and energy",
  description:
    "Find your focus pillar in 8 minutes. A science-based wellbeing assessment across 7 areas of life — Finance, Relationship, Information, Emotion, Nutrition, Dynamics, Sleep. Free to start.",
  openGraph: {
    title: "Friends Intelligence",
    description:
      "Find your focus pillar in 8 minutes. Free wellbeing assessment across the 7 Friends pillars.",
    url: "https://friendsintelligence.net",
    siteName: "Friends Intelligence",
    locale: "en_AU",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Friends Intelligence",
    description:
      "Find your focus pillar in 8 minutes. Free wellbeing assessment across the 7 Friends pillars.",
  },
  metadataBase: new URL("https://friendsintelligence.net"),
};

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`transition-transform group-hover:translate-x-0.5 ${className}`}
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

function Check() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-[3px] flex-none text-primary"
      aria-hidden="true"
    >
      <path d="M3 8.5l3 3 7-7" />
    </svg>
  );
}

function Dash() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="mt-[3px] flex-none text-ink-3 opacity-50"
      aria-hidden="true"
    >
      <path d="M4 8h8" />
    </svg>
  );
}

function IconAssess() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  );
}

function IconInsight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v8l5 3" />
    </svg>
  );
}

function IconPractice() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h4l3-7 3 14 3-7h2" />
    </svg>
  );
}

function BrandMark({ size = 26 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-mark.svg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
    />
  );
}

const PILLARS: { letter: string; name: string; desc: string }[] = [
  { letter: "F", name: "Finance",      desc: "Money clarity and the calm that follows it." },
  { letter: "R", name: "Relationship", desc: "The handful of people who carry your week." },
  { letter: "I", name: "Information",  desc: "What you let into your attention, and on what terms." },
  { letter: "E", name: "Emotion",      desc: "Naming what you feel before it names you." },
  { letter: "N", name: "Nutrition",    desc: "How you fuel a body that has to last decades." },
  { letter: "D", name: "Dynamics",     desc: "Movement, environment, and the rooms you inhabit." },
  { letter: "S", name: "Sleep",        desc: "The base layer everything else is built on." },
];

function SectionHead({
  eyebrow,
  title,
  blurb,
}: {
  eyebrow: string;
  title: ReactNode;
  blurb: string;
}) {
  return (
    <div className="mb-12 grid max-w-[40rem] gap-2.5">
      <span className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ink-3">
        {eyebrow}
      </span>
      <h2 className="m-0 text-[clamp(1.6rem,2.6vw,2.1rem)] font-medium leading-[1.15] tracking-[-0.02em] text-balance">
        {title}
      </h2>
      <p className="m-0 text-base text-ink-2 text-pretty">{blurb}</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg font-sans text-ink antialiased">
      <LandingAuthRedirect />
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-transparent bg-bg/85 backdrop-blur-md backdrop-saturate-150">
        <div className="mx-auto flex h-16 max-w-[70rem] items-center justify-between px-6">
          <Link href="/" className="inline-flex items-center gap-2.5 text-[0.95rem] font-semibold tracking-[-0.005em] text-ink no-underline">
            <BrandMark />
            <span>Friends Intelligence</span>
          </Link>
          <nav className="flex items-center gap-2" aria-label="Primary">
            <Link href="#how" className="hidden rounded-md px-3 py-2 text-sm text-ink-2 no-underline hover:bg-bg-2 hover:text-ink sm:inline-block">
              How it works
            </Link>
            <Link href="#pillars" className="hidden rounded-md px-3 py-2 text-sm text-ink-2 no-underline hover:bg-bg-2 hover:text-ink sm:inline-block">
              Pillars
            </Link>
            <Link href="#access" className="hidden rounded-md px-3 py-2 text-sm text-ink-2 no-underline hover:bg-bg-2 hover:text-ink sm:inline-block">
              Access
            </Link>
            <Link href="/auth" className="rounded-md px-3 py-2 text-sm text-ink-2 no-underline hover:bg-bg-2 hover:text-ink">
              Log in
            </Link>
            <Link
              href="/assessment"
              className="group hidden h-9 items-center gap-2 rounded-[0.5rem] bg-primary px-3.5 text-[0.85rem] font-medium text-white no-underline transition-colors hover:bg-[oklch(0.5_0.22_260)] sm:inline-flex"
            >
              Start free assessment
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="px-6 pt-24 pb-28 text-center sm:pt-28 sm:pb-32">
          <div className="mx-auto max-w-[47.5rem]">
            <div className="mb-7 hidden items-center gap-2 rounded-full border border-line-2 bg-white px-3 py-1.5 text-[0.78rem] text-ink-2 sm:inline-flex">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>35-question assessment · 7 pillars · about 8 minutes</span>
            </div>
            <h1 className="mb-6 text-[clamp(2.4rem,5.5vw,4.25rem)] font-medium leading-[1.05] tracking-[-0.025em] text-balance">
              A life operating system for{" "}
              <em className="not-italic text-primary">better decisions</em>{" "}
              and energy.
            </h1>
            <p className="mx-auto mb-9 max-w-[36rem] text-[clamp(1.05rem,1.4vw,1.2rem)] text-ink-2 text-pretty">
              Find your focus pillar, then build one small daily practice at a time.
            </p>
            <div className="inline-flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/assessment"
                className="group inline-flex h-12 items-center gap-2 rounded-[0.5rem] bg-primary px-5 text-[0.95rem] font-medium text-white no-underline transition-colors hover:bg-[oklch(0.5_0.22_260)]"
              >
                Start free assessment <Arrow />
              </Link>
              <Link
                href="/auth"
                className="inline-flex h-12 items-center gap-2 rounded-[0.5rem] border border-line bg-transparent px-5 text-[0.95rem] font-medium text-ink no-underline transition-colors hover:border-[oklch(0.85_0.012_260)] hover:bg-bg-2"
              >
                Log in
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-t border-line-2 px-6 py-24 sm:py-28">
          <div className="mx-auto max-w-[70rem]">
            <SectionHead
              eyebrow="How it works"
              title="Depth over breadth. Three steps."
              blurb="Three steps, each one narrow enough to actually follow through on."
            />
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {[
                { n: "01", icon: <IconAssess />, title: "Assess", body: "35 questions across the seven Friends pillars. Honest answers, no right or wrong." },
                { n: "02", icon: <IconInsight />, title: "Insight", body: "A personalised report with your scores and one focus pillar to start with — not a long to-do list." },
                { n: "03", icon: <IconPractice />, title: "Practice", body: "Build one small daily practice at a time. We'll flag if you drift. We won't nag." },
              ].map((s) => (
                <div
                  key={s.n}
                  className="grid content-start gap-3 rounded-xl border border-line-2 bg-white p-7"
                >
                  <div className="mb-1 grid h-9 w-9 place-items-center rounded-[10px] bg-primary-soft text-primary-ink">
                    {s.icon}
                  </div>
                  <span className="font-mono text-[0.72rem] tracking-[0.1em] text-ink-3">
                    {s.n}
                  </span>
                  <h3 className="m-0 text-[1.15rem] font-medium tracking-[-0.01em]">
                    {s.title}
                  </h3>
                  <p className="m-0 text-[0.95rem] text-ink-2">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pillars */}
        <section id="pillars" className="border-t border-line-2 px-6 py-24 sm:py-28">
          <div className="mx-auto max-w-[70rem]">
            <SectionHead
              eyebrow="The framework"
              title="Seven pillars. One word."
              blurb="Seven areas of life, each with its own score and practices. You don't work on all seven — you start with one."
            />
            <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 min-[980px]:grid-cols-4">
              {PILLARS.map((p) => (
                <article
                  key={p.letter}
                  className="grid min-h-[10.5rem] content-start gap-3.5 rounded-xl border border-line-2 bg-white p-6"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-[10px] bg-primary-soft text-[1.05rem] font-semibold text-primary-ink">
                    {p.letter}
                  </div>
                  <div className="text-base font-medium tracking-[-0.005em] text-ink">
                    {p.name}
                  </div>
                  <p className="text-[0.875rem] leading-[1.5] text-ink-2 text-pretty">
                    {p.desc}
                  </p>
                </article>
              ))}
              <div
                aria-hidden="true"
                className="col-span-full hidden flex-wrap items-baseline gap-2 rounded-[0.5rem] border border-dashed border-line px-5 py-4 font-mono text-[0.8rem] text-ink-3 min-[980px]:flex"
              >
                {PILLARS.map((p, i) => (
                  <span key={p.letter} className="inline-flex items-baseline">
                    {i > 0 && <span className="mr-2">·</span>}
                    <span>
                      <strong className="font-medium text-ink">{p.letter}</strong>
                      {p.name.slice(1)}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Plans */}
        <section id="access" className="border-t border-line-2 px-6 py-24 sm:py-28">
          <div className="mx-auto max-w-[70rem]">
            <SectionHead
              eyebrow="Access"
              title="Free to start. Honest about what's paid."
              blurb="The assessment and your insight report are free. Plus plan is for when one habit has stuck and you're ready to go deeper."
            />
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Free */}
              <article className="grid content-start gap-5 rounded-xl border border-line-2 bg-white p-8">
                <div className="grid gap-2">
                  <span className="text-base font-medium tracking-[-0.005em]">Free</span>
                  <div className="flex items-baseline gap-2 text-[2rem] font-medium tracking-[-0.02em]">
                    A$0 <small className="text-[0.85rem] font-normal text-ink-3">/ forever</small>
                  </div>
                  <p className="m-0 text-[0.95rem] text-ink-2">
                    Everything you need to find your focus and start one practice.
                  </p>
                </div>
                <ul className="m-0 grid list-none gap-2.5 p-0">
                  <li className="flex items-start gap-2.5 text-[0.92rem] text-ink-2"><Check /> Full 35-question assessment</li>
                  <li className="flex items-start gap-2.5 text-[0.92rem] text-ink-2"><Check /> Personalised insight report</li>
                  <li className="flex items-start gap-2.5 text-[0.92rem] text-ink-2"><Check /> Scores across all seven pillars</li>
                  <li className="flex items-start gap-2.5 text-[0.92rem] text-ink-2"><Check /> One active daily practice</li>
                  <li className="flex items-start gap-2.5 text-[0.92rem] text-ink-2"><Dash /> Up to 10 active practices</li>
                </ul>
                <div className="mt-2">
                  <Link
                    href="/assessment"
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[0.5rem] border border-line bg-transparent px-5 text-[0.95rem] font-medium text-ink no-underline transition-colors hover:border-[oklch(0.85_0.012_260)] hover:bg-bg-2"
                  >
                    Start free assessment
                  </Link>
                </div>
              </article>

              {/* Plus plan */}
              <article
                className="grid content-start gap-5 rounded-xl border bg-white p-8"
                style={{
                  borderColor: "oklch(0.85 0.04 260)",
                  background: "linear-gradient(180deg, #ffffff 0%, oklch(0.96 0.025 260) 200%)",
                }}
              >
                <div className="grid gap-2">
                  <span className="text-base font-medium tracking-[-0.005em]">Plus plan</span>
                  <div className="flex items-baseline gap-2 text-[2rem] font-medium tracking-[-0.02em]">
                    A$19 <small className="text-[0.85rem] font-normal text-ink-3">/ lifetime</small>
                  </div>
                  <p className="m-0 text-[0.95rem] text-ink-2">
                    For when one practice has stuck and you&apos;re ready to layer more — without losing depth.
                  </p>
                </div>
                <ul className="m-0 grid list-none gap-2.5 p-0">
                  <li className="flex items-start gap-2.5 text-[0.92rem] text-ink-2"><Check /> Everything in Free</li>
                  <li className="flex items-start gap-2.5 text-[0.92rem] text-ink-2"><Check /> Up to 10 active practices</li>
                  <li className="flex items-start gap-2.5 text-[0.92rem] text-ink-2"><Check /> Active practices across all seven pillars</li>
                  <li className="flex items-start gap-2.5 text-[0.92rem] text-ink-2"><Check /> Practice history and patterns</li>
                  <li className="flex items-start gap-2.5 text-[0.92rem] text-ink-2"><Check /> Early access to new pillars</li>
                </ul>
                <div className="mt-2">
                  <Link
                    href="/auth"
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[0.5rem] bg-primary px-5 text-[0.95rem] font-medium text-white no-underline transition-colors hover:bg-[oklch(0.5_0.22_260)]"
                  >
                    Get Plus plan
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section id="start" className="border-t border-line-2 px-6 py-24 text-center sm:py-28">
          <div className="mx-auto max-w-[47.5rem]">
            <h2 className="m-0 mb-4 text-[clamp(1.8rem,3.2vw,2.6rem)] font-medium tracking-[-0.02em] text-balance">
              Find your focus pillar in about eight minutes.
            </h2>
            <p className="mx-auto mb-8 max-w-[30rem] text-ink-2 text-pretty">
              Free and quiet. No streaks, no daily guilt — just a clearer picture of where to start.
            </p>
            <div className="inline-flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/assessment"
                className="group inline-flex h-12 items-center gap-2 rounded-[0.5rem] bg-primary px-5 text-[0.95rem] font-medium text-white no-underline transition-colors hover:bg-[oklch(0.5_0.22_260)]"
              >
                Start free assessment <Arrow />
              </Link>
              <Link href="/auth" className="px-1 text-[0.95rem] text-ink-2 no-underline hover:text-ink">
                Already have an account? Log in
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-line-2 px-6 pt-8 pb-12 text-[0.85rem] text-ink-3">
        <div className="mx-auto flex max-w-[70rem] flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 text-[0.85rem] font-semibold text-ink no-underline">
            <BrandMark size={22} />
            <span>Friends Intelligence</span>
          </Link>
          <div className="flex gap-5">
            <Link href="/privacy" className="text-ink-3 no-underline hover:text-ink">Privacy</Link>
            <Link href="/terms" className="text-ink-3 no-underline hover:text-ink">Terms</Link>
            <Link href="/contact" className="text-ink-3 no-underline hover:text-ink">Contact</Link>
          </div>
          <div>© 2026 Friends Intelligence</div>
        </div>
      </footer>
    </div>
  );
}
