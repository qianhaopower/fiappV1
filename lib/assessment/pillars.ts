export const pillarOrder = [
  "financial",
  "relationship",
  "information",
  "emotional",
  "nutrition",
  "dynamic",
  "sleep",
] as const;

export type Pillar = (typeof pillarOrder)[number];

export const pillarLabels: Record<Pillar, string> = {
  financial: "Financial",
  relationship: "Relationship",
  information: "Information",
  emotional: "Emotional",
  nutrition: "Nutrition",
  dynamic: "Dynamic",
  sleep: "Sleep",
};
