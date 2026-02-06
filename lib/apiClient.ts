export type ApiMeResponse<TProfile = unknown> = {
  user?: {
    userId?: string;
    username?: string;
  };
  profile?: TProfile;
};

export async function fetchMe<TProfile>(): Promise<{
  status: number;
  data: ApiMeResponse<TProfile> | null;
}> {
  const res = await fetch("/api/me", {
    cache: "no-store",
    credentials: "include",
  });

  let data: ApiMeResponse<TProfile> | null = null;
  try {
    data = (await res.json()) as ApiMeResponse<TProfile>;
  } catch {
    data = null;
  }

  return { status: res.status, data };
}
