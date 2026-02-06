export type PillarKey =
  | "financial"
  | "relationship"
  | "information"
  | "emotional"
  | "nutrition"
  | "dynamic"
  | "sleep";

export const pillarColors: Record<PillarKey, string> = {
  financial: "#3A7CA5",
  relationship: "#C97C8C",
  information: "#6A5ACD",
  emotional: "#9B4F96",
  nutrition: "#6B8E23",
  dynamic: "#D17A22",
  sleep: "#2F4A6D",
};
