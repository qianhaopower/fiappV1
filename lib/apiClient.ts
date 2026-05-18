export type ApiMeResponse<TProfile = unknown> = {
  ok?: boolean;
  data?: TProfile;
  profile?: TProfile; // normalized for backwards compat when ok/data envelope
};

// Lambda cold start after a long idle window can easily blow 5–10s on the
// first invocation, and that's exactly when a user signs in after a quiet
// period. We give each attempt a generous per-call budget and retry the
// classes of failure that warming up will resolve. See #419.
const PER_ATTEMPT_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [400, 1200];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchMeOnce(): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PER_ATTEMPT_TIMEOUT_MS);
  try {
    return await fetch("/api/me", {
      cache: "no-store",
      credentials: "include",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchMe<TProfile>(): Promise<{
  status: number;
  data: ApiMeResponse<TProfile> | null;
}> {
  let lastError: unknown = null;
  let res: Response | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      res = await fetchMeOnce();
      // 5xx is also worth retrying — same warmup story as a hung request.
      if (res.status >= 500 && attempt < MAX_ATTEMPTS - 1) {
        await sleep(RETRY_BACKOFF_MS[attempt] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1]);
        continue;
      }
      break;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(RETRY_BACKOFF_MS[attempt] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1]);
        continue;
      }
    }
  }

  if (!res) {
    throw lastError ?? new Error("fetchMe failed without response");
  }

  let body: { ok?: boolean; data?: TProfile } | null = null;
  try {
    body = (await res.json()) as { ok?: boolean; data?: TProfile };
  } catch {
    return { status: res.status, data: null };
  }

  // Normalize { ok: true, data } envelope to { profile } for consumers
  const data: ApiMeResponse<TProfile> =
    body?.ok && body?.data !== undefined
      ? { ok: true, data: body.data, profile: body.data }
      : (body as ApiMeResponse<TProfile>);

  return { status: res.status, data };
}
