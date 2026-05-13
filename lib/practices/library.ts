import type { Pillar } from '@/lib/assessment/pillars'
import { pillarOrder } from '@/lib/assessment/pillars'

export type Practice = {
  id: string
  pillar: Pillar
  order: number
  mappedQuestionId: string
  title: string
  description: string
  rationale: string
}

export const practices: Practice[] = [
  // ── Financial ──────────────────────────────────────────────────────────────
  {
    id: 'financial-weekly-review',
    pillar: 'financial',
    order: 1,
    mappedQuestionId: 'financial-1',
    title: 'Weekly spending review',
    description: 'Spend 5 minutes reviewing your transactions from the past week.',
    rationale: 'Awareness is the first step to control. Seeing where money actually goes — without judgment — builds financial clarity faster than any budget tool.',
  },
  {
    id: 'financial-bill-list',
    pillar: 'financial',
    order: 2,
    mappedQuestionId: 'financial-2',
    title: 'List upcoming bills',
    description: 'Write out the bills and payments coming up in the next 30 days.',
    rationale: 'Surprise bills create more financial stress than predictable ones. A simple list — even on paper — turns vague anxiety into a clear plan you can act on.',
  },
  {
    id: 'financial-24hr-rule',
    pillar: 'financial',
    order: 3,
    mappedQuestionId: 'financial-3',
    title: '24-hour purchase pause',
    description: 'Before any non-essential purchase, wait 24 hours before buying.',
    rationale: 'Most impulse spending evaporates overnight. This single habit can reduce unnecessary purchases by 30–50% without any willpower required.',
  },
  {
    id: 'financial-save-small',
    pillar: 'financial',
    order: 4,
    mappedQuestionId: 'financial-4',
    title: 'Save one small amount',
    description: 'Transfer a small fixed amount to savings on the same day each week.',
    rationale: 'Consistency matters more than size. Automating a small saving builds the habit and identity of someone who saves, regardless of the amount.',
  },
  {
    id: 'financial-expense-buffer',
    pillar: 'financial',
    order: 5,
    mappedQuestionId: 'financial-5',
    title: 'Reserve for one known expense',
    description: 'Set aside money for one upcoming non-monthly expense — insurance, registration, a gift.',
    rationale: 'Most financial "emergencies" are predictable expenses people did not plan for. Reserving in advance — even partially — removes the panic from spending you already knew was coming.',
  },

  // ── Relationship ───────────────────────────────────────────────────────────
  {
    id: 'relationship-one-deeper-question',
    pillar: 'relationship',
    order: 1,
    mappedQuestionId: 'relationship-1',
    title: 'Ask one deeper question',
    description: 'In conversation today, ask one question that goes beyond surface small talk.',
    rationale: 'Connection scales with the depth of questions asked, not the time spent. A single curious question — "what has been on your mind lately?" — often shifts a conversation from polite to meaningful.',
  },
  {
    id: 'relationship-device-free-meal',
    pillar: 'relationship',
    order: 2,
    mappedQuestionId: 'relationship-2',
    title: 'Device-free meal',
    description: 'Eat at least one meal each day without any screens at the table.',
    rationale: 'Undivided presence during shared meals is one of the strongest predictors of relationship quality. Removing devices triples the depth of conversation.',
  },
  {
    id: 'relationship-express-gratitude',
    pillar: 'relationship',
    order: 3,
    mappedQuestionId: 'relationship-3',
    title: 'Express one appreciation',
    description: 'Tell one person something specific you appreciate about them today.',
    rationale: 'Expressed gratitude strengthens both parties. Most people rarely hear what others value about them — saying it out loud creates lasting positive impact.',
  },
  {
    id: 'relationship-pause-before-reply',
    pillar: 'relationship',
    order: 4,
    mappedQuestionId: 'relationship-4',
    title: 'Pause before replying',
    description: 'When a conversation gets tense, take a slow breath before you respond.',
    rationale: 'Most regrettable replies happen in the first three seconds of feeling provoked. A single pause activates the thinking part of your brain before the reactive part takes over.',
  },
  {
    id: 'relationship-daily-checkin',
    pillar: 'relationship',
    order: 5,
    mappedQuestionId: 'relationship-5',
    title: 'Daily check-in message',
    description: 'Send one genuine message to someone you care about each day.',
    rationale: 'Relationships deteriorate through neglect more than conflict. A brief, sincere message signals presence and sustains bonds over distance and time.',
  },

  // ── Information ────────────────────────────────────────────────────────────
  {
    id: 'information-thinking-block',
    pillar: 'information',
    order: 1,
    mappedQuestionId: 'information-1',
    title: '30-minute thinking block',
    description: 'Set aside 30 uninterrupted minutes to think about one important question or problem.',
    rationale: 'Deep thought rarely happens between meetings or scrolling sessions. A protected block — without inputs — is when actual insight tends to surface.',
  },
  {
    id: 'information-news-free-morning',
    pillar: 'information',
    order: 2,
    mappedQuestionId: 'information-2',
    title: 'News-free morning',
    description: 'Keep your first 30 minutes after waking free from news and social media.',
    rationale: 'Starting the day with incoming information sets a reactive rather than intentional tone. A quiet morning gives you agency over your first thoughts.',
  },
  {
    id: 'information-evening-review',
    pillar: 'information',
    order: 3,
    mappedQuestionId: 'information-3',
    title: 'Evening learning note',
    description: 'Write one sentence about something useful you learned or noticed today.',
    rationale: 'Deliberate reflection converts passive experience into retained knowledge. One sentence a day compounds into meaningful self-awareness over months.',
  },
  {
    id: 'information-single-tab',
    pillar: 'information',
    order: 4,
    mappedQuestionId: 'information-4',
    title: 'Single-tab focus session',
    description: 'Work with only one browser tab open for at least 30 minutes.',
    rationale: 'Tab-switching is a hidden productivity drain. Restricting yourself to one tab for a focused block trains attention and reduces context-switching cost.',
  },
  {
    id: 'information-decision-pause',
    pillar: 'information',
    order: 5,
    mappedQuestionId: 'information-5',
    title: '10-minute decision pause',
    description: 'Before any non-urgent decision, wait at least 10 minutes before committing.',
    rationale: 'Most regrettable decisions are made under time pressure that was not real. A brief pause is usually enough for the impulsive option to lose its appeal.',
  },

  // ── Emotional ──────────────────────────────────────────────────────────────
  {
    id: 'emotional-name-feeling',
    pillar: 'emotional',
    order: 1,
    mappedQuestionId: 'emotional-1',
    title: 'Name one feeling',
    description: 'Pause once during the day and name the emotion you are experiencing.',
    rationale: 'Naming an emotion activates the prefrontal cortex and reduces its intensity. The simple act of labelling "I feel anxious" creates space between feeling and reaction.',
  },
  {
    id: 'emotional-3-breath-reset',
    pillar: 'emotional',
    order: 2,
    mappedQuestionId: 'emotional-2',
    title: '3-breath reset',
    description: 'When you feel overwhelmed, take 3 slow, full breaths before responding.',
    rationale: 'Three deep breaths shift the nervous system from sympathetic (stress) to parasympathetic (calm) mode. It is the fastest evidence-based emotional regulation tool available.',
  },
  {
    id: 'emotional-trigger-note',
    pillar: 'emotional',
    order: 3,
    mappedQuestionId: 'emotional-3',
    title: 'Note one trigger',
    description: 'When you notice a strong reaction, write down what triggered it — even just a few words.',
    rationale: 'Patterns are invisible until you write them down. A short trigger note over a few weeks reveals the situations that consistently destabilise you — and shows you what to change.',
  },
  {
    id: 'emotional-journal-3-lines',
    pillar: 'emotional',
    order: 4,
    mappedQuestionId: 'emotional-4',
    title: '3-line evening journal',
    description: 'Write 3 sentences about your day each evening — what happened, how you felt, what you notice.',
    rationale: 'Regular journalling is linked to reduced anxiety, better sleep, and improved emotional clarity. Three sentences is enough to gain the benefit without the burden.',
  },
  {
    id: 'emotional-calm-routine',
    pillar: 'emotional',
    order: 5,
    mappedQuestionId: 'emotional-5',
    title: '5-minute calming routine',
    description: 'Do a short calming routine each day — breathwork, slow tea, brief walk — even when you do not feel stressed.',
    rationale: 'Stress-regulation tools work best when practised before they are needed. A small daily calm builds the baseline that makes hard moments easier to ride out.',
  },

  // ── Nutrition ──────────────────────────────────────────────────────────────
  {
    id: 'nutrition-vegetables-first',
    pillar: 'nutrition',
    order: 1,
    mappedQuestionId: 'nutrition-1',
    title: 'Vegetables first',
    description: 'Eat your vegetables before the rest of your meal.',
    rationale: 'Eating fibre first slows glucose absorption and improves the glycaemic response of the entire meal. It is one of the simplest and most effective nutrition interventions.',
  },
  {
    id: 'nutrition-no-processed-snack',
    pillar: 'nutrition',
    order: 2,
    mappedQuestionId: 'nutrition-2',
    title: 'Swap one processed snack',
    description: 'Replace one ultra-processed snack today with a whole-food alternative — fruit, nuts, yoghurt.',
    rationale: 'Ultra-processed foods are designed to override fullness signals. Even a single substitution per day shifts hunger patterns and energy stability over time.',
  },
  {
    id: 'nutrition-half-plate-check',
    pillar: 'nutrition',
    order: 3,
    mappedQuestionId: 'nutrition-3',
    title: 'Halfway check-in',
    description: 'Pause halfway through a meal and ask if you are still hungry.',
    rationale: 'Fullness signals lag behind actual fullness by 15–20 minutes. A mid-meal pause gives the signal time to catch up — often it turns out you have already had enough.',
  },
  {
    id: 'nutrition-water-first',
    pillar: 'nutrition',
    order: 4,
    mappedQuestionId: 'nutrition-4',
    title: 'Water before coffee',
    description: 'Drink a glass of water before your first coffee or tea each morning.',
    rationale: 'The body wakes up mildly dehydrated. Rehydrating first improves focus, reduces false hunger, and makes the subsequent caffeine more effective.',
  },
  {
    id: 'nutrition-eat-without-screens',
    pillar: 'nutrition',
    order: 5,
    mappedQuestionId: 'nutrition-5',
    title: 'Eat without screens',
    description: 'Have at least one meal per day away from all screens.',
    rationale: 'Eating while distracted reduces satiety signals and increases portion size. Mindful eating — just paying attention — improves digestion and reduces overeating.',
  },

  // ── Dynamic ────────────────────────────────────────────────────────────────
  {
    id: 'dynamic-10-min-walk',
    pillar: 'dynamic',
    order: 1,
    mappedQuestionId: 'dynamic-1',
    title: '10-minute walk',
    description: 'Take a 10-minute walk each day — outside if possible.',
    rationale: 'Even a single 10-minute walk improves mood, reduces fatigue, and boosts creative thinking. It is the minimum effective dose of movement for mental and physical benefit.',
  },
  {
    id: 'dynamic-daylight-block',
    pillar: 'dynamic',
    order: 2,
    mappedQuestionId: 'dynamic-2',
    title: '10 minutes of daylight',
    description: 'Spend at least 10 minutes outdoors in natural light, ideally in the morning.',
    rationale: 'Outdoor light is 50–100x brighter than indoor lighting. Even a short daily dose anchors your circadian rhythm, improves mood, and boosts alertness more reliably than caffeine.',
  },
  {
    id: 'dynamic-one-challenge',
    pillar: 'dynamic',
    order: 3,
    mappedQuestionId: 'dynamic-3',
    title: 'One small challenge',
    description: 'Do one thing today that is slightly outside your comfort zone — physical or mental.',
    rationale: 'Capacity grows from controlled discomfort. A small daily challenge — a harder set, a difficult conversation, a tricky problem — keeps you adaptable and confident.',
  },
  {
    id: 'dynamic-active-choice',
    pillar: 'dynamic',
    order: 4,
    mappedQuestionId: 'dynamic-4',
    title: 'One active choice',
    description: 'Choose one small opportunity to move more today — stairs, a walk to a farther stop, a standing call.',
    rationale: 'Non-exercise activity thermogenesis (NEAT) accounts for most of the variation in daily calorie expenditure. Small active choices accumulate into significant health benefits.',
  },
  {
    id: 'dynamic-stretch-break',
    pillar: 'dynamic',
    order: 5,
    mappedQuestionId: 'dynamic-5',
    title: 'Movement break',
    description: 'Stand up and stretch or move for 2 minutes every 60–90 minutes of sitting.',
    rationale: 'Prolonged sitting degrades circulation and focus independent of total exercise. Brief movement breaks reset posture, reduce back tension, and sharpen concentration.',
  },

  // ── Sleep ──────────────────────────────────────────────────────────────────
  {
    id: 'sleep-consistent-bedtime',
    pillar: 'sleep',
    order: 1,
    mappedQuestionId: 'sleep-1',
    title: 'Consistent bedtime',
    description: 'Go to bed within 30 minutes of the same time each night.',
    rationale: 'Sleep consistency is more important than total duration for cognitive performance. A regular bedtime stabilises your circadian rhythm, improving both sleep quality and morning alertness.',
  },
  {
    id: 'sleep-wind-down-ritual',
    pillar: 'sleep',
    order: 2,
    mappedQuestionId: 'sleep-2',
    title: '10-minute wind-down ritual',
    description: 'Spend the last 10 minutes before bed in a calm, repeatable routine — reading, stretching, dim light.',
    rationale: 'Sleep onset depends on a transition from alert to relaxed. A consistent wind-down ritual cues your nervous system that sleep is coming and shortens the time it takes to fall asleep.',
  },
  {
    id: 'sleep-screen-off',
    pillar: 'sleep',
    order: 3,
    mappedQuestionId: 'sleep-3',
    title: 'Screens off 30 minutes before bed',
    description: 'Turn off all screens at least 30 minutes before your target bedtime.',
    rationale: 'Blue light from screens suppresses melatonin production and delays sleep onset by up to 90 minutes. Eliminating it accelerates sleep initiation and deepens early sleep cycles.',
  },
  {
    id: 'sleep-morning-light',
    pillar: 'sleep',
    order: 4,
    mappedQuestionId: 'sleep-4',
    title: 'Morning light exposure',
    description: 'Get natural light — outdoors or near a bright window — within 30 minutes of waking.',
    rationale: 'Morning light anchors your circadian clock, which controls sleep timing, cortisol, and mood. It is the most powerful free tool for regulating your body\'s 24-hour rhythm.',
  },
  {
    id: 'sleep-bedroom-prep',
    pillar: 'sleep',
    order: 5,
    mappedQuestionId: 'sleep-5',
    title: 'Cool, dark, quiet check',
    description: 'Before bed, check your room is cool (~18°C), dark, and quiet.',
    rationale: 'Sleep environment quality affects deep sleep more than total time in bed. A 5-second environment check eliminates the common disruptors that cost you the most restorative hours.',
  },
]

export const practicesById = new Map(practices.map((p) => [p.id, p]))

export const practiceByQuestionId = new Map(
  practices.map((p) => [p.mappedQuestionId, p])
)

export const practicesByPillar = pillarOrder.reduce<Record<Pillar, Practice[]>>(
  (acc, pillar) => {
    acc[pillar] = practices
      .filter((p) => p.pillar === pillar)
      .sort((a, b) => a.order - b.order)
    return acc
  },
  {} as Record<Pillar, Practice[]>
)
