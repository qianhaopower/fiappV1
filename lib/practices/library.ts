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
    id: 'financial-label-decision',
    pillar: 'financial',
    order: 1,
    mappedQuestionId: 'financial-1',
    title: 'Label one spending decision',
    description: 'Label one spending decision as Need, Want, Convenience, Emotion, or Future Investment.',
    rationale: 'Awareness of why you spent — not just that you spent — is what changes behaviour over time. Categorising a single decision reveals the patterns that quietly drive most of your spending.',
  },
  {
    id: 'financial-repeated-cost',
    pillar: 'financial',
    order: 2,
    mappedQuestionId: 'financial-2',
    title: 'Notice one repeated cost',
    description: 'Notice one small repeatable cost today, such as coffee, snacks, delivery fees, parking, or small add-ons.',
    rationale: 'Small recurring purchases are invisible individually but significant over months. Spotting one is the first step to deciding whether it is worth keeping.',
  },
  {
    id: 'financial-auto-payment-review',
    pillar: 'financial',
    order: 3,
    mappedQuestionId: 'financial-3',
    title: 'Review one automatic payment',
    description: 'Check one automatic payment, subscription, bill, loan repayment, or insurance renewal to see if it still makes sense.',
    rationale: 'Automatic payments survive because no one looks at them. A 2-minute check on a single item typically uncovers something cheaper, unused, or no longer needed.',
  },
  {
    id: 'financial-purchase-pause',
    pillar: 'financial',
    order: 4,
    mappedQuestionId: 'financial-4',
    title: '24-hour purchase pause',
    description: 'Delay one non-urgent purchase for 24 hours before deciding.',
    rationale: 'Most impulse purchases lose their pull overnight. A single day of delay is usually enough for the wanting to fade — or to confirm the purchase is genuinely worth it.',
  },
  {
    id: 'financial-discuss-purchase',
    pillar: 'financial',
    order: 5,
    mappedQuestionId: 'financial-5',
    title: 'Stress-test the purchase',
    description: 'Before one significant purchase, stress-test it: discuss it with someone, sleep on it for 24 hours, or check it against your financial goals.',
    rationale: 'Significant purchases benefit from at least one check beyond the impulse to buy. A short conversation, a night\'s sleep, or a goal check is usually enough to confirm the purchase or dissolve the urge.',
  },

  // ── Relationship ───────────────────────────────────────────────────────────
  {
    id: 'relationship-listen-to-understand',
    pillar: 'relationship',
    order: 1,
    mappedQuestionId: 'relationship-1',
    title: 'Listen to understand',
    description: 'Give your full attention in one conversation and try to understand before responding.',
    rationale: 'Most conversations stall because people listen to reply, not to understand. A few minutes of genuine attention — no interrupting, no jumping ahead — changes the texture of a relationship more than any clever response.',
  },
  {
    id: 'relationship-caring-question',
    pillar: 'relationship',
    order: 2,
    mappedQuestionId: 'relationship-2',
    title: 'Ask one caring question',
    description: 'Ask one caring question and listen to understand, not to fix.',
    rationale: 'A single curious question — asked because you actually want to know — opens doors that small talk never does. The aim is to understand, not to advise or solve.',
  },
  {
    id: 'relationship-notice-detail',
    pillar: 'relationship',
    order: 3,
    mappedQuestionId: 'relationship-3',
    title: 'Notice one small detail',
    description: 'Notice and remember one small detail about someone you have a relationship with.',
    rationale: 'Feeling known matters more than feeling complimented. Remembering a small detail — a stressful week, a favourite drink, a quiet preference — is a quiet signal that someone matters to you.',
  },
  {
    id: 'relationship-phone-away',
    pillar: 'relationship',
    order: 4,
    mappedQuestionId: 'relationship-4',
    title: 'Phone-away presence',
    description: 'Put your phone away during one shared moment, meal, or conversation.',
    rationale: 'Even an unused phone on the table reduces conversation depth — the brain partially scans for it. Removing it sends a clear signal that the person in front of you has your full attention.',
  },
  {
    id: 'relationship-caring-action',
    pillar: 'relationship',
    order: 5,
    mappedQuestionId: 'relationship-5',
    title: 'One small caring action',
    description: 'Do one small caring action: say thank you, give a hug, send a kind message, help with something, or suggest a simple shared activity.',
    rationale: 'Relationships are sustained more by small frequent care than by occasional grand gestures. A quick thank-you, a kind message, a small offer of help — these compound far beyond their size.',
  },

  // ── Information ────────────────────────────────────────────────────────────
  {
    id: 'information-focus-block',
    pillar: 'information',
    order: 1,
    mappedQuestionId: 'information-1',
    title: 'One-thing focus block',
    description: 'Spend one short block of time doing one task only, without switching apps, tabs, or activities.',
    rationale: 'Every task switch carries a hidden cost — attention takes minutes to fully re-engage. A protected block on a single thing is when real progress, depth, and insight actually happen.',
  },
  {
    id: 'information-phone-away-think',
    pillar: 'information',
    order: 2,
    mappedQuestionId: 'information-2',
    title: 'Phone away to think',
    description: 'Put your phone away during one thinking, learning, or working session.',
    rationale: 'Even a face-down phone within reach drains attention — the brain reserves a slice of focus for what might come next. Out of sight is the only setting that fully frees the mind to think.',
  },
  {
    id: 'information-check-source',
    pillar: 'information',
    order: 3,
    mappedQuestionId: 'information-3',
    title: 'Check one source',
    description: 'Pause before believing one headline, post, ad, or opinion today, and check one thing: the source, the missing context, or another viewpoint.',
    rationale: 'Most misinformation spreads because it confirms what we already feel. A 30-second pause to ask "who said this, and what is missing?" is the single biggest defence against being quietly steered.',
  },
  {
    id: 'information-learn-in-chunks',
    pillar: 'information',
    order: 4,
    mappedQuestionId: 'information-4',
    title: 'Learn in chunks',
    description: 'Take something you are already trying to learn and break it into one small chunk, such as one recipe step, one exercise movement, one coding concept, one paragraph, or one piano bar.',
    rationale: 'Big learning goals stall because the brain cannot engage with a vague target. Shrinking the goal to one specific chunk — one step, one bar, one paragraph — makes today\'s attempt concrete and finishable.',
  },
  {
    id: 'information-review-learning',
    pillar: 'information',
    order: 5,
    mappedQuestionId: 'information-5',
    title: 'Review what you learned',
    description: 'Review or test one recent learning item today, such as explaining one idea, repeating one exercise technique, recalling one new word, replaying one song section, or checking one work skill.',
    rationale: 'Most of what you read or hear is forgotten within 48 hours unless you actively retrieve it. One short review — explaining, repeating, recalling — turns fleeting input into retained knowledge.',
  },

  // ── Emotional ──────────────────────────────────────────────────────────────
  {
    id: 'emotional-name-before-reacting',
    pillar: 'emotional',
    order: 1,
    mappedQuestionId: 'emotional-1',
    title: 'Name before reacting',
    description: 'Name one emotion today before reacting, such as anxiety, anger, sadness, excitement, shame, calm, or frustration.',
    rationale: 'Naming a feeling activates the thinking part of the brain and quiets the reactive part. The half-second between feeling and labelling is where calmer choices live.',
  },
  {
    id: 'emotional-now-or-echo',
    pillar: 'emotional',
    order: 2,
    mappedQuestionId: 'emotional-2',
    title: 'Now or echo?',
    description: 'Ask once today: "Is this about what is happening now, or is an old feeling being triggered?"',
    rationale: 'Strong feelings often arrive far bigger than the trigger deserves — because they carry weight from older, similar moments. Asking "now or echo?" separates the present from the past.',
  },
  {
    id: 'emotional-assume-neutral',
    pillar: 'emotional',
    order: 3,
    mappedQuestionId: 'emotional-3',
    title: 'Assume neutral first',
    description: 'When something feels unclear today, pause and think of one neutral explanation before reacting.',
    rationale: 'The brain fills ambiguity with the worst-case story to keep you safe — but that story is rarely the true one. A neutral explanation, held briefly, prevents conflicts that never had a real cause.',
  },
  {
    id: 'emotional-subtract-to-solve',
    pillar: 'emotional',
    order: 4,
    mappedQuestionId: 'emotional-4',
    title: 'Say no to protect capacity',
    description: 'Say no to one optional demand on your time, energy, or attention today.',
    rationale: 'Emotional capacity is finite. Saying yes to every demand trains the brain to feel overwhelmed and resentful. One deliberate no protects the energy you need for what actually matters.',
  },
  {
    id: 'emotional-set-tone',
    pillar: 'emotional',
    order: 5,
    mappedQuestionId: 'emotional-5',
    title: 'Set the room\'s tone',
    description: 'Bring a calmer tone, face, or posture into one interaction today.',
    rationale: 'Emotional states are contagious — a tense face, a sharp tone, a rushed posture spreads to everyone in the room. Bringing calm into one interaction often resets the atmosphere for everyone in it.',
  },

  // ── Nutrition ──────────────────────────────────────────────────────────────
  {
    id: 'nutrition-label-why-eating',
    pillar: 'nutrition',
    order: 1,
    mappedQuestionId: 'nutrition-1',
    title: 'Label why you ate',
    description: 'Before or after one eating moment today, label why you ate: Hunger, Craving, Boredom, Stress, Habit, or Social Needs.',
    rationale: 'Most overeating is not about hunger — it is driven by emotion, habit, or environment. Labelling the real reason once a day reveals the patterns behind your choices, without trying to change them yet.',
  },
  {
    id: 'nutrition-balanced-meal',
    pillar: 'nutrition',
    order: 2,
    mappedQuestionId: 'nutrition-2',
    title: 'Build one balanced meal',
    description: 'Build one meal with protein, carbohydrates, and vegetables or fruit.',
    rationale: 'One balanced meal a day is enough to steady energy, mood, and satiety for the next several hours. Protein, carbohydrates, and plants — even a simple version beats no balance at all.',
  },
  {
    id: 'nutrition-shape-environment',
    pillar: 'nutrition',
    order: 3,
    mappedQuestionId: 'nutrition-3',
    title: 'Shape your food environment',
    description: 'Make one small change that nudges you toward healthier eating: hide snacks, prepare a healthy option, make water visible, or remove one tempting cue.',
    rationale: 'Willpower runs out; environment does not. Hiding one tempting food or placing one healthy option in plain sight changes what you eat without requiring extra decisions.',
  },
  {
    id: 'nutrition-screen-free-meal',
    pillar: 'nutrition',
    order: 4,
    mappedQuestionId: 'nutrition-4',
    title: 'Eat without screens',
    description: 'Eat one meal or snack without your phone, TV, or computer, and notice taste, fullness, and satisfaction.',
    rationale: 'Eating while distracted bypasses the brain\'s fullness signals — you tend to eat more and enjoy it less. One screen-free meal restores both satiety and satisfaction.',
  },
  {
    id: 'nutrition-forgotten-food',
    pillar: 'nutrition',
    order: 5,
    mappedQuestionId: 'nutrition-5',
    title: 'Expand your variety',
    description: 'Add one nutrient-dense food you rarely have — fermented foods, oily fish, sprouts, organ meat, dark berries, or seaweed.',
    rationale: 'Modern diets are wide on calories but narrow on nutrients and variety. One unfamiliar nutrient-dense food a week — fermented, sprouted, oily, leafy, or oceanic — covers gaps no daily routine reaches.',
  },

  // ── Dynamic ────────────────────────────────────────────────────────────────
  {
    id: 'dynamic-move-today',
    pillar: 'dynamic',
    order: 1,
    mappedQuestionId: 'dynamic-1',
    title: 'Move today',
    description: 'Move your body today: take a walk, stretch, do a short exercise, or play a sport.',
    rationale: 'The body adapts to whatever it does most often. A single act of movement — walk, stretch, sport, lift — tells it to stay capable, alert, and resilient. Skipped days tell it the opposite.',
  },
  {
    id: 'dynamic-match-recovery',
    pillar: 'dynamic',
    order: 2,
    mappedQuestionId: 'dynamic-2',
    title: 'Match effort to recovery',
    description: 'Check your body before moving and choose the right level: easier, normal, or harder.',
    rationale: 'Pushing hard on a depleted body is how injuries and burnout happen. A 10-second check — sleep, soreness, stress — and adjusting intensity is what keeps you training for years instead of weeks.',
  },
  {
    id: 'dynamic-lower-start-cost',
    pillar: 'dynamic',
    order: 3,
    mappedQuestionId: 'dynamic-3',
    title: 'Lower the start cost',
    description: 'Make tomorrow\'s movement easier today: put your shoes out, prepare workout clothes, set a reminder, choose a route, or clear space for stretching.',
    rationale: 'Most missed workouts fail before they begin — at the friction of finding clothes, deciding where to go, or fitting it into the day. Setting up the night before removes the decisions that get you stuck.',
  },
  {
    id: 'dynamic-train-multiple',
    pillar: 'dynamic',
    order: 4,
    mappedQuestionId: 'dynamic-4',
    title: 'Train more than one ability',
    description: 'Add one small movement from a different area: brisk walking for cardio, squats for strength, stretching for mobility, or short jumps for power.',
    rationale: 'A body that only does one type of movement gets one type of fitness — and stays fragile in everything else. A small dose of a different ability — cardio, strength, mobility, or power — keeps the whole system resilient.',
  },
  {
    id: 'dynamic-repeatable-routine',
    pillar: 'dynamic',
    order: 5,
    mappedQuestionId: 'dynamic-5',
    title: 'Pick something repeatable',
    description: 'Choose one movement today that is small enough to repeat and not so hard that it breaks your routine.',
    rationale: 'The best workout is the one you actually do tomorrow. Smaller, repeatable movement beats ambitious sessions that get skipped. Consistency over months is what builds capacity, not single heroic days.',
  },

  // ── Sleep ──────────────────────────────────────────────────────────────────
  {
    id: 'sleep-consistent-bedtime',
    pillar: 'sleep',
    order: 1,
    mappedQuestionId: 'sleep-1',
    title: 'Consistent bedtime',
    description: 'Go to bed at your usual time tonight, or keep it within a small range.',
    rationale: 'The body\'s sleep system runs on a clock — and that clock is set by when you sleep, not by hours slept. A bedtime within a 30-minute window most nights gives you better sleep than longer hours at random times.',
  },
  {
    id: 'sleep-morning-light',
    pillar: 'sleep',
    order: 2,
    mappedQuestionId: 'sleep-2',
    title: 'Morning light',
    description: 'Get 5–10 minutes of outdoor light soon after waking.',
    rationale: 'Morning light tells the brain when day starts — which sets when night ends, 16 hours later. A few minutes outside within the first hour of waking is the strongest, cheapest tool for sleeping well that night.',
  },
  {
    id: 'sleep-dim-before-bed',
    pillar: 'sleep',
    order: 3,
    mappedQuestionId: 'sleep-3',
    title: 'Dim before bed',
    description: 'Dim the lights and avoid screens for the last 30 minutes before sleep.',
    rationale: 'Bright light at night blocks melatonin and delays sleep by up to 90 minutes. Dimming the room and stepping away from screens for half an hour is what makes sleep arrive on time.',
  },
  {
    id: 'sleep-improve-room',
    pillar: 'sleep',
    order: 4,
    mappedQuestionId: 'sleep-4',
    title: 'Improve the room',
    description: 'Improve one bedroom condition: cooler temperature, less light, less noise, less clutter, or better comfort.',
    rationale: 'Sleep quality depends more on the environment than on total hours in bed. One small fix — a cooler room, blackout curtains, a fan for white noise — often unlocks deeper sleep more reliably than going to bed earlier.',
  },
  {
    id: 'sleep-evening-inputs',
    pillar: 'sleep',
    order: 5,
    mappedQuestionId: 'sleep-5',
    title: 'Mind the evening inputs',
    description: 'Avoid late caffeine, finish your main meal earlier, or keep evening movement gentle.',
    rationale: 'Caffeine has a 5–6 hour half-life, digestion runs for hours, and intense evening exercise raises body temperature when it should be falling. Small adjustments earlier in the day protect the sleep you would otherwise lose at 2am.',
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
