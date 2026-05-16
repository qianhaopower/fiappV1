import { pillarOrder, type Pillar } from "@/lib/assessment/pillars";

export type AssessmentQuestion = {
  id: string;
  pillar: Pillar;
  order: number;
  mappedPracticeId: string;
  text: string;
  suggestions?: string[];
};

/**
 * Real question text bank (5 per pillar).
 * Each question maps 1:1 to a Practice via mappedPracticeId (see lib/practices/library.ts).
 */
export type Question = AssessmentQuestion;

export const QUESTIONS: Question[] = [
  {
    id: "financial-1",
    pillar: "financial",
    order: 1,
    mappedPracticeId: "financial-label-decision",
    text: "Have you noticed at least one spending decision and understood why you made it?",
    suggestions: [
      "Pick the last thing you bought and label it: Need, Want, Convenience, Emotion, or Future Investment.",
      "Notice which label shows up most often this week.",
      "Before your next purchase, ask: \"Which of the five is this?\"",
    ],
  },
  {
    id: "financial-2",
    pillar: "financial",
    order: 2,
    mappedPracticeId: "financial-repeated-cost",
    text: "Have you noticed a small repeated spending habit that could add up over time?",
    suggestions: [
      "List 3 small purchases you make most weeks (coffee, snacks, delivery, parking).",
      "Multiply one of them by 52 to see its yearly cost.",
      "Pick one to keep with intention and one to question.",
    ],
  },
  {
    id: "financial-3",
    pillar: "financial",
    order: 3,
    mappedPracticeId: "financial-auto-payment-review",
    text: "Have you reviewed one automatic payment, subscription, bill, loan repayment, or insurance renewal?",
    suggestions: [
      "Open your bank app and pick one recurring charge.",
      "Ask: \"Do I still use this? Could I get it cheaper?\"",
      "Cancel, downgrade, or keep — make a clear call.",
    ],
  },
  {
    id: "financial-4",
    pillar: "financial",
    order: 4,
    mappedPracticeId: "financial-purchase-pause",
    text: "Have you paused before buying something that was not immediately needed?",
    suggestions: [
      "Put it in your cart and close the tab.",
      "Set a reminder for tomorrow: \"Do I still want this?\"",
      "If yes after 24 hours, buy it with confidence.",
    ],
  },
  {
    id: "financial-5",
    pillar: "financial",
    order: 5,
    mappedPracticeId: "financial-discuss-purchase",
    text: "Have you stress-tested a significant purchase before deciding — by discussing it with someone, sleeping on it, or checking against your goals?",
    suggestions: [
      "Define what counts as \"significant\" for you — e.g. over $200.",
      "Sleep on it before deciding.",
      "Ask: \"Does this fit my actual financial goals?\"",
    ],
  },
  {
    id: "relationship-1",
    pillar: "relationship",
    order: 1,
    mappedPracticeId: "relationship-listen-to-understand",
    text: "Have you tried to truly listen without interrupting, judging, or rushing to a conclusion?",
    suggestions: [
      "Wait 2 seconds before responding in your next conversation.",
      "Notice the urge to fix or argue, and let it pass.",
      "Summarise what the other person said before adding your view.",
    ],
  },
  {
    id: "relationship-2",
    pillar: "relationship",
    order: 2,
    mappedPracticeId: "relationship-caring-question",
    text: "Have you asked someone how they are feeling or what has been on their mind, with real curiosity?",
    suggestions: [
      "Try: \"What's been on your mind lately?\"",
      "Resist the urge to jump in with a solution.",
      "If they share something hard, just sit with them — no fixing required.",
    ],
  },
  {
    id: "relationship-3",
    pillar: "relationship",
    order: 3,
    mappedPracticeId: "relationship-notice-detail",
    text: "Have you noticed one small detail about someone's life, mood, preference, or stress?",
    suggestions: [
      "Pick one person and recall one specific thing they mentioned recently.",
      "Reference it next time you see them: \"How did X go?\"",
      "Jot small details in your notes if you tend to forget.",
    ],
  },
  {
    id: "relationship-4",
    pillar: "relationship",
    order: 4,
    mappedPracticeId: "relationship-phone-away",
    text: "Have you spent time with someone without your phone taking your attention away?",
    suggestions: [
      "Leave your phone in another room for one meal.",
      "Flip it face-down at minimum.",
      "Tell the other person: \"phone away, you have me.\"",
    ],
  },
  {
    id: "relationship-5",
    pillar: "relationship",
    order: 5,
    mappedPracticeId: "relationship-caring-action",
    text: "Have you done one small caring action for someone today?",
    suggestions: [
      "Send one \"thinking of you\" message today.",
      "Say thank you for something small and specific.",
      "Offer help before being asked.",
    ],
  },
  {
    id: "information-1",
    pillar: "information",
    order: 1,
    mappedPracticeId: "information-focus-block",
    text: "Have you protected time to focus on one thing without switching between tasks?",
    suggestions: [
      "Try a 25-minute single-task block — phone away, one tab open.",
      "Pick the task before you start; don't decide once you're in it.",
      "When the urge to switch hits, write the distraction down and keep going.",
    ],
  },
  {
    id: "information-2",
    pillar: "information",
    order: 2,
    mappedPracticeId: "information-phone-away-think",
    text: "Have you avoided using your phone or social media when you needed to think, learn, or work?",
    suggestions: [
      "Leave your phone in another room for one focus session.",
      "Use airplane mode if you need the timer or notes app.",
      "Tell people: \"away until [time]\" so you're not catching up later.",
    ],
  },
  {
    id: "information-3",
    pillar: "information",
    order: 3,
    mappedPracticeId: "information-check-source",
    text: "Have you questioned one piece of information before believing it, such as a news headline, social media post, advertisement, or strong opinion?",
    suggestions: [
      "When something makes you feel strongly, that's the signal to check it.",
      "Look for the original source, not the summary.",
      "Read one piece from a different perspective on the same topic.",
    ],
  },
  {
    id: "information-4",
    pillar: "information",
    order: 4,
    mappedPracticeId: "information-learn-in-chunks",
    text: "Have you broken something you wanted to learn into a small part, such as one step, one concept, one page, or one technique?",
    suggestions: [
      "Pick the smallest piece you can practise today in 10 minutes.",
      "Finish the chunk before adding anything else.",
      "Stack chunks across days — they compound.",
    ],
  },
  {
    id: "information-5",
    pillar: "information",
    order: 5,
    mappedPracticeId: "information-review-learning",
    text: "Have you reviewed, repeated, explained, or tested something you recently learned, such as a new word, idea, recipe, exercise, song, or work skill?",
    suggestions: [
      "Pick one thing you learned this week and explain it out loud.",
      "Test yourself before you reread — recall beats rereading.",
      "Teach the thing to someone, even briefly.",
    ],
  },
  {
    id: "emotional-1",
    pillar: "emotional",
    order: 1,
    mappedPracticeId: "emotional-name-before-reacting",
    text: "Have you named an emotion before reacting to it?",
    suggestions: [
      "When a strong reaction rises, pause and say the feeling silently — \"anger\", \"hurt\", \"fear\".",
      "Add one word about the cause: \"frustrated about the delay\".",
      "Notice that naming it often shrinks it.",
    ],
  },
  {
    id: "emotional-2",
    pillar: "emotional",
    order: 2,
    mappedPracticeId: "emotional-now-or-echo",
    text: "Have you checked whether a feeling came from the present moment or from an old emotional memory, such as a past rejection, failure, conflict, embarrassment, or fear?",
    suggestions: [
      "When a reaction feels disproportionate, ask: \"Does this feel familiar?\"",
      "Notice if the intensity matches the actual situation.",
      "If it's an echo, name the older moment — and let the current one stay smaller.",
    ],
  },
  {
    id: "emotional-3",
    pillar: "emotional",
    order: 3,
    mappedPracticeId: "emotional-assume-neutral",
    text: "Have you stopped yourself from assuming the worst when something was unclear, such as a short message, delayed reply, flat tone, or unclear facial expression?",
    suggestions: [
      "When a reply feels cold, ask: \"What's a boring reason for this?\"",
      "List three possible explanations before picking one.",
      "Wait for actual information before reacting to imagined ones.",
    ],
  },
  {
    id: "emotional-4",
    pillar: "emotional",
    order: 4,
    mappedPracticeId: "emotional-subtract-to-solve",
    text: "Have you protected your emotional capacity by saying no to one demand?",
    suggestions: [
      "Pick one demand on your time or energy and decline it today.",
      "Say no without long explanations — \"I can't this week\" is enough.",
      "Remember that every yes is a no to something else.",
    ],
  },
  {
    id: "emotional-5",
    pillar: "emotional",
    order: 5,
    mappedPracticeId: "emotional-set-tone",
    text: "Have you noticed how your emotional state affected the atmosphere around you?",
    suggestions: [
      "Soften your face before your next conversation.",
      "Slow your speech by half a beat.",
      "Notice the shift in how others respond when you bring calm.",
    ],
  },
  {
    id: "nutrition-1",
    pillar: "nutrition",
    order: 1,
    mappedPracticeId: "nutrition-label-why-eating",
    text: "Have you labelled why you were eating: hunger, craving, boredom, stress, habit, or social needs?",
    suggestions: [
      "After your next snack, ask: \"Was I actually hungry?\"",
      "Notice which label appears most often this week.",
      "No judgement — labelling alone is enough.",
    ],
  },
  {
    id: "nutrition-2",
    pillar: "nutrition",
    order: 2,
    mappedPracticeId: "nutrition-balanced-meal",
    text: "Have you eaten one balanced meal with protein, carbohydrates, and vegetables or fruit?",
    suggestions: [
      "Pick one meal and make sure all three categories appear.",
      "Frozen vegetables and tinned fish count — easy beats perfect.",
      "Plate visually: half plants, quarter protein, quarter carbs.",
    ],
  },
  {
    id: "nutrition-3",
    pillar: "nutrition",
    order: 3,
    mappedPracticeId: "nutrition-shape-environment",
    text: "Have you made your food environment support healthier choices?",
    suggestions: [
      "Move snacks off the counter into a cupboard.",
      "Cut up fruit or vegetables and put them at eye level.",
      "Keep a water glass on your desk.",
    ],
  },
  {
    id: "nutrition-4",
    pillar: "nutrition",
    order: 4,
    mappedPracticeId: "nutrition-screen-free-meal",
    text: "Have you eaten without a screen taking your attention away?",
    suggestions: [
      "Pick one meal a day: no phone, TV, or laptop at the table.",
      "Notice the first bite — temperature, texture, flavour.",
      "Pause halfway through and check fullness.",
    ],
  },
  {
    id: "nutrition-5",
    pillar: "nutrition",
    order: 5,
    mappedPracticeId: "nutrition-forgotten-food",
    text: "Have you added one food you don't usually eat, to expand your nutrition variety?",
    suggestions: [
      "Pick one food you haven't eaten this month — sprouts, fermented foods, oily fish, organ meat, dark berries, or seaweed.",
      "Add it to a meal you already eat regularly.",
      "Notice if your energy or digestion shifts over the next few days.",
    ],
  },
  {
    id: "dynamic-1",
    pillar: "dynamic",
    order: 1,
    mappedPracticeId: "dynamic-move-today",
    text: "Have you moved your body, such as exercising, walking, stretching, or playing a sport?",
    suggestions: [
      "If you've done nothing yet, go for a 10-minute walk now.",
      "Pair movement with something you already do — call, podcast, errand.",
      "Anything beats nothing — even 5 minutes counts.",
    ],
  },
  {
    id: "dynamic-2",
    pillar: "dynamic",
    order: 2,
    mappedPracticeId: "dynamic-match-recovery",
    text: "Have you matched your movement to your recovery, energy, soreness, sleep, or stress?",
    suggestions: [
      "Slept poorly? Drop intensity 20%, not the session.",
      "Sore from yesterday? Choose mobility or a walk instead.",
      "Feeling great? Push a bit harder than usual.",
    ],
  },
  {
    id: "dynamic-3",
    pillar: "dynamic",
    order: 3,
    mappedPracticeId: "dynamic-lower-start-cost",
    text: "Have you consciously made movement or exercise easier to do, such as preparing shoes, clothes, equipment, or time in advance?",
    suggestions: [
      "Put tomorrow's workout clothes where you'll see them.",
      "Pre-book a class, route, or time block.",
      "Decide today what tomorrow's movement will be.",
    ],
  },
  {
    id: "dynamic-4",
    pillar: "dynamic",
    order: 4,
    mappedPracticeId: "dynamic-train-multiple",
    text: "Have you trained more than one physical ability, such as cardio, strength, mobility, or power?",
    suggestions: [
      "Add 5 minutes of stretching to a strength day.",
      "Add 10 squats to a walking day.",
      "Try one short burst of jumps or sprints this week.",
    ],
  },
  {
    id: "dynamic-5",
    pillar: "dynamic",
    order: 5,
    mappedPracticeId: "dynamic-repeatable-routine",
    text: "Have you chosen movement that feels realistic enough to repeat?",
    suggestions: [
      "Cut the planned session in half if it's hard to start.",
      "Aim for a routine you'd still do on a busy day.",
      "Notice which sessions you naturally come back to — that's the right size.",
    ],
  },
  {
    id: "sleep-1",
    pillar: "sleep",
    order: 1,
    mappedPracticeId: "sleep-consistent-bedtime",
    text: "Have you gone to bed at a roughly consistent time?",
    suggestions: [
      "Pick a target bedtime and aim within ±30 minutes most nights.",
      "Anchor it to a cue: brushing teeth, dimming lights, last device put away.",
      "Treat it like an appointment — block the time.",
    ],
  },
  {
    id: "sleep-2",
    pillar: "sleep",
    order: 2,
    mappedPracticeId: "sleep-morning-light",
    text: "Have you received morning light soon after waking?",
    suggestions: [
      "Step outside for the first 5 minutes after waking.",
      "Drink your morning coffee on the balcony or near a window.",
      "Walk to grab breakfast or run a small errand outside.",
    ],
  },
  {
    id: "sleep-3",
    pillar: "sleep",
    order: 3,
    mappedPracticeId: "sleep-dim-before-bed",
    text: "Have you reduced screens or bright light before bed?",
    suggestions: [
      "Switch to warm lamps, not overhead lights, after dinner.",
      "Charge your phone outside the bedroom.",
      "Replace screen time with reading, stretching, or quiet talk.",
    ],
  },
  {
    id: "sleep-4",
    pillar: "sleep",
    order: 4,
    mappedPracticeId: "sleep-improve-room",
    text: "Have you made your bedroom easier to sleep in?",
    suggestions: [
      "Drop the room temperature to around 18°C.",
      "Block light: blackout curtains, eye mask, or move chargers with LEDs.",
      "Add white noise or earplugs if street noise wakes you.",
    ],
  },
  {
    id: "sleep-5",
    pillar: "sleep",
    order: 5,
    mappedPracticeId: "sleep-evening-inputs",
    text: "Have you kept food, caffeine, and late exercise from disturbing your sleep?",
    suggestions: [
      "Cut off caffeine 8 hours before bed (so 2pm for a 10pm sleep).",
      "Finish dinner at least 2–3 hours before sleep.",
      "Move hard workouts to morning or early afternoon.",
    ],
  },
];

export const assessmentQuestions: AssessmentQuestion[] = QUESTIONS;

export const assessmentQuestionIds = new Set(
  assessmentQuestions.map((q) => q.id)
);

export const assessmentQuestionsById = new Map(
  assessmentQuestions.map((q) => [q.id, q])
);

export const questionByPracticeId = new Map(
  assessmentQuestions.map((q) => [q.mappedPracticeId, q])
);
