"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";

export default function LandingAuthRedirect() {
  const router = useRouter();
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      router.replace("/today");
    }
  }, [authStatus, router]);

  return null;
}
