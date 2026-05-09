"use client";

import { useEffect, useState } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { fetchUserAttributes } from "aws-amplify/auth";

export function useUserEmail(): string {
  const { user } = useAuthenticator((ctx) => [ctx.user]);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    if (!user) {
      setEmail("");
      return;
    }
    let cancelled = false;
    fetchUserAttributes()
      .then((attrs) => {
        if (!cancelled && attrs.email) setEmail(attrs.email);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  const fallback = user?.signInDetails?.loginId ?? "";
  const username = user?.username ?? "";
  const isFederatedUsername = username.includes("_") && /^[a-z]+_[a-zA-Z0-9-]+$/.test(username);
  return email || fallback || (isFederatedUsername ? "" : username);
}
