"use client";

import { useEffect, useState } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";

export function useUserEmail(): string {
  const { user } = useAuthenticator((ctx) => [ctx.user]);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    if (!user) {
      setEmail("");
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const attrs = await fetchUserAttributes();
        if (!cancelled && attrs.email) {
          setEmail(attrs.email);
          return;
        }
      } catch {}

      try {
        const session = await fetchAuthSession();
        const claim = session.tokens?.idToken?.payload?.email;
        if (!cancelled && typeof claim === "string" && claim) {
          setEmail(claim);
        }
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const loginId = user?.signInDetails?.loginId ?? "";
  return email || loginId || "";
}
