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

  it("GAP-P1: null input defaults to free", () => {
    expect(isPlusPlan(null)).toBe(false);
    expect(getPlanLabel(null)).toBe("Free plan");
    expect(getPlanShortLabel(null)).toBe("Free");
  });

  it("GAP-P1: undefined input defaults to free", () => {
    expect(isPlusPlan(undefined)).toBe(false);
    expect(getPlanLabel(undefined)).toBe("Free plan");
    expect(getPlanShortLabel(undefined)).toBe("Free");
  });

  it("GAP-P2: lowercase 'paid' is treated as PAID", () => {
    expect(isPlusPlan("paid")).toBe(true);
    expect(getPlanLabel("paid")).toBe("Plus plan");
    expect(getPlanShortLabel("paid")).toBe("Plus");
  });

  it("GAP-P2: lowercase 'free' is treated as FREE", () => {
    expect(isPlusPlan("free")).toBe(false);
    expect(getPlanLabel("free")).toBe("Free plan");
  });

  it("GAP-P3: empty string defaults to free", () => {
    expect(isPlusPlan("")).toBe(false);
    expect(getPlanLabel("")).toBe("Free plan");
  });

  it("GAP-P3: unknown status string defaults to free", () => {
    expect(isPlusPlan("UNKNOWN")).toBe(false);
    expect(getPlanLabel("UNKNOWN")).toBe("Free plan");
  });
});
