"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { fetchMe } from "@/lib/apiClient";

export type Profile = {
  userId?: string;
  subscriptionStatus?: "FREE" | "PAID";
  latestAssessmentId?: string | null;
  activePracticeIds?: string[] | null;
  activeTrialCount?: number | null;
  todayFocusPracticeId?: string | null;
  [key: string]: unknown;
};

type ProfileState = {
  profile: Profile | null;
  loading: boolean;
  error: { status?: number; message?: string } | null;
  refetch: () => Promise<void>;
};

const ProfileContext = createContext<ProfileState | null>(null);

export function useProfile(): ProfileState {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    return {
      profile: null,
      loading: false,
      error: null,
      refetch: async () => {},
    };
  }
  return ctx;
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ status?: number; message?: string } | null>(null);

  const fetchProfile = useCallback(async () => {
    if (authStatus !== "authenticated") return;

    setLoading(true);
    setError(null);

    try {
      const { status, data } = await fetchMe<Profile>();

      if (status === 401 || status === 403) {
        setProfile(null);
        setError({ status, message: "Unauthorized" });
        return;
      }

      if (!data?.profile && !data?.data) {
        setProfile(null);
        setError({ status, message: "Failed to load profile" });
        return;
      }

      const p = (data?.profile ?? data?.data) as Profile;
      setProfile(p);
      setError(null);
    } catch (err) {
      setProfile(null);
      setError({
        message: err instanceof Error ? err.message : "Failed to load profile",
      });
    } finally {
      setLoading(false);
    }
  }, [authStatus]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <ProfileContext.Provider
      value={{ profile, loading, error, refetch: fetchProfile }}
    >
      {children}
    </ProfileContext.Provider>
  );
}
