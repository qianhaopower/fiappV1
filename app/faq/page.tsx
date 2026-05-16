import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ — Friends Intelligence",
};

const faqs = [
  {
    q: "What is Friends Intelligence?",
    a: "Friends Intelligence is a personal reflection and habit-building app based on the F.R.I.E.N.D.S Intelligence framework. The idea is simple: lasting wellbeing comes from small, consistent actions across the areas that matter most in life — not from one big change. The app helps you see where you stand, pick one thing to work on, and build the habit of showing up daily.",
  },
  {
    q: "What are the 7 pillars?",
    a: "The pillars are Financial, Relationship, Information, Emotional, Nutrition, Dynamic (movement and physical activity), and Sleep. Each one represents an area of life where consistent habits have an outsized effect on how you feel and function day to day.",
  },
  {
    q: "What does my pillar score actually mean?",
    a: "Each pillar has 5 yes/no questions. Your score (e.g. 3/5) reflects how many you answered Yes to based on the last 7–14 days. It's a snapshot of your current habits — not a permanent label, not a grade. A 2/5 just means there's room to grow in that area right now.",
  },
  {
    q: "Why is one pillar highlighted on my results?",
    a: "Your results highlight your lowest-scoring pillar, and the 3 suggested practices come from that pillar. Research on behaviour change shows that working on your weakest area tends to have the biggest positive ripple effect on everything else. It's not that the other pillars don't matter — it's that starting where you have the most room to grow gives you the fastest return.",
  },
  {
    q: "My score seems low — does that mean I'm failing?",
    a: "No. A low score means you have room to grow, not that something is wrong with you. The assessment measures recent habits at a single point in time. Most people score low in at least one or two areas — that's normal and expected. The score is a starting point, not a verdict.",
  },
  {
    q: "What's the difference between an active and a paused practice?",
    a: "An active practice is one you're showing up for on Today. Pausing it takes it off Today but keeps all your history — your total completions and daily logs stay intact, and you can resume it anytime. Pausing is the right move when something isn't fitting your life right now; there's no penalty, and nothing is deleted.",
  },
  {
    q: "How often should I retake the assessment?",
    a: "Every 4–6 weeks is a good rhythm. Retaking too soon won't show meaningful change — habits take time to shift. After a few weeks of consistent daily check-ins, retaking gives you a more honest picture of whether things have moved. You can retake any time from your Account page.",
  },
  {
    q: "Why can I only have one active practice on the free plan?",
    a: "It's intentional. Research on habit formation consistently shows that trying to change multiple things at once leads to burnout and abandonment. One practice, done consistently, builds the habit muscle. Once that's solid, adding more makes sense. Plus plan unlocks up to 10 active practices for when you're ready.",
  },
  {
    q: "What's the difference between 'Did it' and 'Not today'?",
    a: "'Did it' logs that you completed your practice. 'Not today' logs that you skipped — and that's completely fine. Both count as showing up to your check-in. What matters long-term is the habit of reflecting, not perfection. There's no judgment attached to 'Not today'.",
  },
  {
    q: "Does skipping a day reset my progress?",
    a: "Your streak resets if you skip a day, but your total progress — your counters and milestones — never resets. Every 'Did it' you've ever logged is permanently counted. A skipped day is just a skipped day. Your history stays intact.",
  },
];

export default function FAQPage() {
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
        <p className="mb-3 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ink-3">Help</p>
        <h1 className="mb-4 text-[clamp(1.8rem,3vw,2.4rem)] font-medium leading-[1.1] tracking-[-0.02em]">
          Frequently asked questions
        </h1>
        <p className="mb-12 text-ink-2">
          Answers to the questions most people have while getting started.
        </p>

        <div className="grid gap-8">
          {faqs.map(({ q, a }) => (
            <section key={q}>
              <h2 className="mb-2 text-base font-medium text-ink">{q}</h2>
              <p className="text-[0.95rem] leading-[1.7] text-ink-2">{a}</p>
            </section>
          ))}
        </div>

        <div className="mt-16 border-t border-line-2 pt-8 text-[0.9rem] text-ink-3">
          Still have a question?{" "}
          <a href="mailto:hello@friendsintelligence.net" className="text-primary no-underline hover:underline">
            Email us
          </a>
          {" "}or visit the{" "}
          <Link href="/disclaimer" className="text-primary no-underline hover:underline">
            disclaimer
          </Link>
          {" "}for what the app is and isn&apos;t.
        </div>
      </main>
    </div>
  );
}
