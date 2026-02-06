"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "aws-amplify/auth";
import { ensureAmplifyConfigured } from "@/lib/amplifyClient";
import { getE2EAuthMock } from "@/lib/testAuthMock";

interface AuthGateProps {
  children: ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    ensureAmplifyConfigured();
    let cancelled = false;

    async function checkAuth() {
      const mockState = getE2EAuthMock();
      if (mockState === true) {
        if (!cancelled) {
          router.replace("/decideRoute");
        }
        return;
      }

      if (mockState === false) {
        if (!cancelled) {
          setChecking(false);
        }
        return;
      }

      try {
        await getCurrentUser();
        if (!cancelled) {
          router.replace("/decideRoute");
        }
      } catch {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}
