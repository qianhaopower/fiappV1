import { describe, it, expect } from "vitest";
import { detectInAppBrowser } from "@/lib/inAppBrowser";

describe("detectInAppBrowser", () => {
  it("returns WeChat for MicroMessenger UA", () => {
    expect(
      detectInAppBrowser(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) MicroMessenger/8.0.42"
      )
    ).toBe("WeChat");
  });

  it("returns Facebook for FBAN/FBAV UA", () => {
    expect(detectInAppBrowser("Mozilla/5.0 FBAN/FBIOS;FBAV/450.0")).toBe("Facebook");
  });

  it("returns Instagram for Instagram UA", () => {
    expect(detectInAppBrowser("Mozilla/5.0 Instagram 301.0.0.33.110")).toBe("Instagram");
  });

  it("returns TikTok for ByteDance / TTWebView UA", () => {
    expect(
      detectInAppBrowser("Mozilla/5.0 musical_ly_31.4.0 JsSdk/2.0 NetType/WIFI TTWebView/123")
    ).toBe("TikTok");
  });

  it("returns Line for Line/ UA", () => {
    expect(
      detectInAppBrowser("Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Line/13.0.0")
    ).toBe("Line");
  });

  it("returns null for Safari", () => {
    expect(
      detectInAppBrowser(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1"
      )
    ).toBeNull();
  });

  it("returns null for Chrome", () => {
    expect(
      detectInAppBrowser(
        "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
      )
    ).toBeNull();
  });

  it("returns null for empty UA", () => {
    expect(detectInAppBrowser("")).toBeNull();
  });
});
