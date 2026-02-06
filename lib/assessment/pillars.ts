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
