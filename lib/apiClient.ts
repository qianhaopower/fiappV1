export type ApiMeResponse<TProfile = unknown> = {
  ok?: boolean;
  data?: TProfile;
  profile?: TProfile; // normalized for backwards compat when ok/data envelope
};

export async function fetchMe<TProfile>(): Promise<{
  status: number;
  data: ApiMeResponse<TProfile> | null;
}> {
  const res = await fetch("/api/me", {
    cache: "no-store",
    credentials: "include",
  });

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
