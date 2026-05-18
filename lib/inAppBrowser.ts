// Detects known in-app webviews where Google OAuth fails with
// `disallowed_useragent` (Error 403). Returning the name lets the UI
// tailor instructions per app (e.g. "Tap ⋯ → Open in Browser" for WeChat).
// Reference: Google blocks any User-Agent it classifies as an embedded
// webview from completing the OAuth flow.

export type InAppBrowser =
  | "WeChat"
  | "Facebook"
  | "Instagram"
  | "TikTok"
  | "Line";

export function detectInAppBrowser(userAgent: string): InAppBrowser | null {
  if (!userAgent) return null;
  if (/MicroMessenger/i.test(userAgent)) return "WeChat";
  if (/FBAN|FBAV/i.test(userAgent)) return "Facebook";
  if (/Instagram/i.test(userAgent)) return "Instagram";
  if (/Bytedance|TTWebView|musical_ly|TikTok/i.test(userAgent)) return "TikTok";
  if (/\bLine\//i.test(userAgent)) return "Line";
  return null;
}
