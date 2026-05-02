import type { Pillar } from '@/lib/assessment/pillars'
import { pillarOrder } from '@/lib/assessment/pillars'

export type Practice = {
  id: string
  pillar: Pillar
  title: string
  description: string
  rationale: string
}

export const practices: Practice[] = [
  // ── Financial ───────────────────────────────────────���──────────────────────
  {
    id: 'financial-weekly-review',
    pillar: 'financial',
    title: 'Weekly spending review',
    description: 'Spend 5 minutes reviewing your transactions from the past week.',
    rationale: 'Awareness is the first step to control. Seeing where money actually goes — without judgment — builds financial clarity faster than any budget tool.',
  },
  {
    id: 'financial-24hr-rule',
    pillar: 'financial',
    title: '24-hour purchase pause',
    description: 'Before any non-essential purchase, wait 24 hours before buying.',
    rationale: 'Most impulse spending evaporates overnight. This single habit can reduce unnecessary purchases by 30–50% without any willpower required.',
  },
  {
    id: 'financial-save-small',
    pillar: 'financial',
    title: 'Save one small amount',
    description: 'Transfer a small fixed amount to savings on the same day each week.',
    rationale: 'Consistency matters more than size. Automating a small saving builds the habit and identity of someone who saves, regardless of the amount.',
  },

  // ── Relationship ──────────────────────────────��────────────────────────────
  {
    id: 'relationship-daily-checkin',
    pillar: 'relationship',
    title: 'Daily check-in message',
    description: 'Send one genuine message to someone you care about each day.',
    rationale: 'Relationships deteriorate through neglect more than conflict. A brief, sincere message signals presence and sustains bonds over distance and time.',
  },
  {
    id: 'relationship-device-free-meal',
    pillar: 'relationship',
    title: 'Device-free meal',
    description: 'Eat at least one meal each day without any screens at the table.',
    rationale: 'Undivided presence during shared meals is one of the strongest predictors of relationship quality. Removing devices triples the depth of conversation.',
  },
  {
    id: 'relationship-express-gratitude',
    pillar: 'relationship',
    title: 'Express one appreciation',
    description: 'Tell one person something specific you appreciate about them today.',
    rationale: 'Expressed gratitude strengthens both parties. Most people rarely hear what others value about them — saying it out loud creates lasting positive impact.',
  },

  // ── Information ─────────────────────────────────���──────────────────────────
  {
    id: 'information-news-free-morning',
    pillar: 'information',
    title: 'News-free morning',
    description: 'Keep your first 30 minutes after waking free from news and social media.',
    rationale: 'Starting the day with incoming information sets a reactive rather than intentional tone. A quiet morning gives you agency over your first thoughts.',
  },
  {
    id: 'information-single-tab',
    pillar: 'information',
    title: 'Single-tab focus session',
    description: 'Work with only one browser tab open for at least 30 minutes.',
    rationale: 'Tab-switching is a hidden productivity drain. Restricting yourself to one tab for a focused block trains attention and reduces context-switching cost.',
  },
  {
    id: 'information-evening-review',
    pillar: 'information',
    title: 'Evening learning note',
    description: 'Write one sentence about something useful you learned or noticed today.',
    rationale: 'Deliberate reflection converts passive experience into retained knowledge. One sentence a day compounds into meaningful self-awareness over months.',
  },

  // ── Emotional ───────────────────────────────────────────���──────────────────
  {
    id: 'emotional-name-feeling',
    pillar: 'emotional',
    title: 'Name one feeling',
    description: 'Pause once during the day and name the emotion you are experiencing.',
    rationale: 'Naming an emotion activates the prefrontal cortex and reduces its intensity. The simple act of labelling "I feel anxious" creates space between feeling and reaction.',
  },
  {
    id: 'emotional-3-breath-reset',
    pillar: 'emotional',
    title: '3-breath reset',
    description: 'When you feel overwhelmed, take 3 slow, full breaths before responding.',
    rationale: 'Three deep breaths shift the nervous system from sympathetic (stress) to parasympathetic (calm) mode. It is the fastest evidence-based emotional regulation tool available.',
  },
  {
    id: 'emotional-journal-3-lines',
    pillar: 'emotional',
    title: '3-line evening journal',
    description: 'Write 3 sentences about your day each evening — what happened, how you felt, what you notice.',
    rationale: 'Regular journalling is linked to reduced anxiety, better sleep, and improved emotional clarity. Three sentences is enough to gain the benefit without the burden.',
  },

  // ── Nutrition ───────────────────────────────────────────────────────��──────
  {
    id: 'nutrition-eat-without-screens',
    pillar: 'nutrition',
    title: 'Eat without screens',
    description: 'Have at least one meal per day away from all screens.',
    rationale: 'Eating while distracted reduces satiety signals and increases portion size. Mindful eating — just paying attention — improves digestion and reduces overeating.',
  },
  {
    id: 'nutrition-water-first',
    pillar: 'nutrition',
    title: 'Water before coffee',
    description: 'Drink a glass of water before your first coffee or tea each morning.',
    rationale: 'The body wakes up mildly dehydrated. Rehydrating first improves focus, reduces false hunger, and makes the subsequent caffeine more effective.',
  },
  {
    id: 'nutrition-vegetables-first',
    pillar: 'nutrition',
    title: 'Vegetables first',
    description: 'Eat your vegetables before the rest of your meal.',
    rationale: 'Eating fibre first slows glucose absorption and improves the glycaemic response of the entire meal. It is one of the simplest and most effective nutrition interventions.',
  },

  // ── Dynamic ──────────────────────────────────���──────────────────────────���──
  {
    id: 'dynamic-10-min-walk',
    pillar: 'dynamic',
    title: '10-minute walk',
    description: 'Take a 10-minute walk each day — outside if possible.',
    rationale: 'Even a single 10-minute walk improves mood, reduces fatigue, and boosts creative thinking. It is the minimum effective dose of movement for mental and physical benefit.',
  },
  {
    id: 'dynamic-stretch-break',
    pillar: 'dynamic',
    title: 'Movement break',
    description: 'Stand up and stretch or move for 2 minutes every 60–90 minutes of sitting.',
    rationale: 'Prolonged sitting degrades circulation and focus independent of total exercise. Brief movement breaks reset posture, reduce back tension, and sharpen concentration.',
  },
  {
    id: 'dynamic-active-choice',
    pillar: 'dynamic',
    title: 'One active choice',
    description: 'Choose one small opportunity to move more today — stairs, a walk to a farther stop, a standing call.',
    rationale: 'Non-exercise activity thermogenesis (NEAT) accounts for most of the variation in daily calorie expenditure. Small active choices accumulate into significant health benefits.',
  },

  // ── Sleep ──────────────────────────────────────────────────────��───────────
  {
    id: 'sleep-consistent-bedtime',
    pillar: 'sleep',
    title: 'Consistent bedtime',
    description: 'Go to bed within 30 minutes of the same time each night.',
    rationale: 'Sleep consistency is more important than total duration for cognitive performance. A regular bedtime stabilises your circadian rhythm, improving both sleep quality and morning alertness.',
  },
  {
    id: 'sleep-screen-off',
    pillar: 'sleep',
    title: 'Screens off 30 minutes before bed',
    description: 'Turn off all screens at least 30 minutes before your target bedtime.',
    rationale: 'Blue light from screens suppresses melatonin production and delays sleep onset by up to 90 minutes. Eliminating it accelerates sleep initiation and deepens early sleep cycles.',
  },
  {
    id: 'sleep-morning-light',
    pillar: 'sleep',
    title: 'Morning light exposure',
    description: 'Get natural light — outdoors or near a bright window — within 30 minutes of waking.',
    rationale: 'Morning light anchors your circadian clock, which controls sleep timing, cortisol, and mood. It is the most powerful free tool for regulating your body\'s 24-hour rhythm.',
  },
]

export const practicesById = new Map(practices.map((p) => [p.id, p]))

export const practicesByPillar = pillarOrder.reduce<Record<Pillar, Practice[]>>(
  (acc, pillar) => {
    acc[pillar] = practices.filter((p) => p.pillar === pillar)
    return acc
  },
  {} as Record<Pillar, Practice[]>
)
