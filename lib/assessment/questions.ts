import { pillarOrder, type Pillar } from "@/lib/assessment/pillars";

export type AssessmentQuestion = {
  id: string;
  pillar: Pillar;
  text: string;
  suggestions?: string[];
};

/**
 * Real question text bank (5 per pillar).
 * IMPORTANT: The keys must match your Pillar values exactly (case-sensitive).
 */
export type Question = AssessmentQuestion;

export const QUESTIONS: Question[] = [
  {
    id: "financial-1",
    pillar: "financial",
    text: "I know roughly how much I spend each week.",
    suggestions: [
      "Check your bank app and estimate your last 7 days’ spending in 5 minutes.",
      "Write a rough weekly number in Notes.",
      "Set a weekly reminder: \"What did I spend?\"",
    ],
  },
  {
    id: "financial-2",
    pillar: "financial",
    text: "I tracked or reviewed my spending at least once this week.",
    suggestions: [
      "Open your bank app and review your last 10 transactions.",
      "Take a screenshot of your statement and scan it.",
      "Add a Sunday 5‑minute \"money review\" reminder.",
    ],
  },
  {
    id: "financial-3",
    pillar: "financial",
    text: "I avoided at least one unnecessary purchase.",
    suggestions: [
      "Add a 24‑hour rule before non‑essential purchases.",
      "Unsubscribe from one marketing email list.",
      "Put a \"Do I really need this?\" note in your wallet/app.",
    ],
  },
  {
    id: "financial-4",
    pillar: "financial",
    text: "I feel in control of my short‑term finances.",
    suggestions: [
      "Write down all upcoming bills this month.",
      "Separate \"must pay\" vs \"optional\" expenses.",
      "Create a simple weekly spending limit.",
    ],
  },
  {
    id: "financial-5",
    pillar: "financial",
    text: "I have a simple plan for upcoming expenses.",
    suggestions: [
      "Write your next 3 known expenses.",
      "Decide where the money will come from.",
      "Put them in your calendar as reminders.",
    ],
  },
  {
    id: "relationship-1",
    pillar: "relationship",
    text: "I had at least one meaningful conversation this week.",
    suggestions: [
      "Call one person and ask how they’re really doing.",
      "Have a 10‑minute no‑phone conversation.",
      "Ask one deeper‑than‑usual question.",
    ],
  },
  {
    id: "relationship-2",
    pillar: "relationship",
    text: "I listened carefully without interrupting in at least one conversation.",
    suggestions: [
      "Practice waiting 2 seconds before replying.",
      "Summarise what the other person said.",
      "Put your phone away during conversations.",
    ],
  },
  {
    id: "relationship-3",
    pillar: "relationship",
    text: "I expressed appreciation or gratitude to someone.",
    suggestions: [
      "Send one thank‑you message.",
      "Say one compliment out loud today.",
      "Write one appreciation note.",
    ],
  },
  {
    id: "relationship-4",
    pillar: "relationship",
    text: "I handled a disagreement calmly and respectfully.",
    suggestions: [
      "Pause before replying when triggered.",
      "Write your response before sending.",
      "Focus on understanding, not winning.",
    ],
  },
  {
    id: "relationship-5",
    pillar: "relationship",
    text: "I felt emotionally connected to someone this week.",
    suggestions: [
      "Spend 20 minutes of undistracted time with someone.",
      "Share something personal.",
      "Ask someone how they’re feeling.",
    ],
  },
  {
    id: "information-1",
    pillar: "information",
    text: "I spent at least 30 minutes learning or thinking deeply about something important.",
    suggestions: [
      "Schedule a 30‑minute thinking or learning block.",
      "Read 5 pages of a serious book.",
      "Watch one educational video intentionally.",
    ],
  },
  {
    id: "information-2",
    pillar: "information",
    text: "I avoided mindless scrolling for at least one intentional block of time.",
    suggestions: [
      "Delete one social app from your home screen.",
      "Set a 15‑minute daily limit for social apps.",
      "Replace scrolling with reading.",
    ],
  },
  {
    id: "information-3",
    pillar: "information",
    text: "I wrote down or captured an idea, insight or lesson.",
    suggestions: [
      "Keep a simple notes file.",
      "Write one sentence per day.",
      "Capture ideas immediately when they appear.",
    ],
  },
  {
    id: "information-4",
    pillar: "information",
    text: "I focused on one important task without multitasking.",
    suggestions: [
      "Try a 25‑minute Pomodoro.",
      "Close all other tabs.",
      "Put your phone in another room.",
    ],
  },
  {
    id: "information-5",
    pillar: "information",
    text: "I made at least one decision based on thinking, not impulse.",
    suggestions: [
      "Delay decisions by 10 minutes.",
      "Write quick pros and cons.",
      "Ask: \"Will I be happy with this tomorrow?\"",
    ],
  },
  {
    id: "emotional-1",
    pillar: "emotional",
    text: "I noticed and named my emotions at least once.",
    suggestions: [
      "Ask yourself 3 times per day: \"What am I feeling?\"",
      "Use a feelings list.",
      "Write emotion + cause in notes.",
    ],
  },
  {
    id: "emotional-2",
    pillar: "emotional",
    text: "I calmed myself effectively when stressed or upset.",
    suggestions: [
      "Do 5 slow breaths.",
      "Walk for 10 minutes.",
      "Do a 1‑minute body scan.",
    ],
  },
  {
    id: "emotional-3",
    pillar: "emotional",
    text: "I did not overreact in a difficult moment.",
    suggestions: [
      "Pause before replying.",
      "Leave the room briefly.",
      "Delay emotional messages.",
    ],
  },
  {
    id: "emotional-4",
    pillar: "emotional",
    text: "I understood why I felt the way I did at least once.",
    suggestions: [
      "Ask: \"What triggered this?\"",
      "Ask: \"What do I need right now?\"",
      "Journal 3 sentences.",
    ],
  },
  {
    id: "emotional-5",
    pillar: "emotional",
    text: "I felt emotionally stable most days.",
    suggestions: [
      "Improve sleep first.",
      "Reduce caffeine or sugar spikes.",
      "Add a daily calming routine.",
    ],
  },
  {
    id: "nutrition-1",
    pillar: "nutrition",
    text: "I ate vegetables or fruit with most meals.",
    suggestions: [
      "Add frozen vegetables to meals.",
      "Add fruit to breakfast.",
      "Keep cut vegetables in the fridge.",
    ],
  },
  {
    id: "nutrition-2",
    pillar: "nutrition",
    text: "I avoided ultra‑processed food most days.",
    suggestions: [
      "Replace one snack with whole food.",
      "Do not buy it at the supermarket.",
      "Cook one simple meal.",
    ],
  },
  {
    id: "nutrition-3",
    pillar: "nutrition",
    text: "I stopped eating when I was comfortably full.",
    suggestions: [
      "Eat slower.",
      "Pause halfway and check fullness.",
      "Use smaller plates.",
    ],
  },
  {
    id: "nutrition-4",
    pillar: "nutrition",
    text: "I drank enough water most days.",
    suggestions: [
      "Keep a bottle on your desk.",
      "Drink a glass before meals.",
      "Set three daily reminders.",
    ],
  },
  {
    id: "nutrition-5",
    pillar: "nutrition",
    text: "I ate with awareness instead of distraction at least once per day.",
    suggestions: [
      "Eat one meal without screens.",
      "Chew slowly.",
      "Notice taste and texture.",
    ],
  },
  {
    id: "dynamic-1",
    pillar: "dynamic",
    text: "I moved my body for at least 20 minutes on most days.",
    suggestions: [
      "Walk after meals.",
      "Do 10 minutes twice a day.",
      "Schedule it like a meeting.",
    ],
  },
  {
    id: "dynamic-2",
    pillar: "dynamic",
    text: "I spent some time outdoors or in daylight.",
    suggestions: [
      "Go for a morning sunlight walk.",
      "Eat lunch outside.",
      "Open windows during the day.",
    ],
  },
  {
    id: "dynamic-3",
    pillar: "dynamic",
    text: "I did something physically or mentally challenging.",
    suggestions: [
      "Increase workout difficulty slightly.",
      "Learn something uncomfortable.",
      "Do one avoided task.",
    ],
  },
  {
    id: "dynamic-4",
    pillar: "dynamic",
    text: "I adapted my plan when something unexpected happened.",
    suggestions: [
      "Write a Plan B next time.",
      "Practice flexible thinking.",
      "Ask: \"What’s the next best move?\"",
    ],
  },
  {
    id: "dynamic-5",
    pillar: "dynamic",
    text: "I felt physically capable and energetic most days.",
    suggestions: [
      "Sleep more.",
      "Eat better.",
      "Reduce overtraining or stress.",
    ],
  },
  {
    id: "sleep-1",
    pillar: "sleep",
    text: "I went to bed and woke up at roughly consistent times.",
    suggestions: [
      "Fix your wake‑up time first.",
      "Move bedtime earlier gradually.",
      "Set a bedtime alarm.",
    ],
  },
  {
    id: "sleep-2",
    pillar: "sleep",
    text: "I slept at least 7 hours on most nights.",
    suggestions: [
      "Go to bed 30 minutes earlier.",
      "Reduce evening screen time.",
      "Protect sleep like an appointment.",
    ],
  },
  {
    id: "sleep-3",
    pillar: "sleep",
    text: "I avoided screens right before sleep most nights.",
    suggestions: [
      "Charge your phone outside the bedroom.",
      "Use night mode.",
      "Replace screens with reading.",
    ],
  },
  {
    id: "sleep-4",
    pillar: "sleep",
    text: "I woke up feeling reasonably refreshed most days.",
    suggestions: [
      "Increase sleep duration.",
      "Improve sleep environment.",
      "Reduce late caffeine.",
    ],
  },
  {
    id: "sleep-5",
    pillar: "sleep",
    text: "I did something to improve my sleep environment or routine.",
    suggestions: [
      "Darken the room.",
      "Make the room cooler.",
      "Create a 10‑minute wind‑down ritual.",
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
