import { describe, expect, it } from "vitest";
import { getPlanLabel, getPlanShortLabel, isPlusPlan } from "@/lib/plans";

describe("plan display helpers", () => {
  it("maps internal FREE status to Free plan labels", () => {
    expect(getPlanLabel("FREE")).toBe("Free plan");
    expect(getPlanShortLabel("FREE")).toBe("Free");
    expect(isPlusPlan("FREE")).toBe(false);
  });

  it("maps internal PAID status to Plus plan labels", () => {
    expect(getPlanLabel("PAID")).toBe("Plus plan");
    expect(getPlanShortLabel("PAID")).toBe("Plus");
    expect(isPlusPlan("PAID")).toBe(true);
  });
});
