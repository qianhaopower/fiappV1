export function getE2EAuthMock(): boolean | null {
  if (process.env.NEXT_PUBLIC_E2E_AUTH_MOCK !== "1") {
    return null;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const value = (window as Window & { __FIAPP_AUTH__?: boolean }).__FIAPP_AUTH__;
  return typeof value === "boolean" ? value : null;
}
