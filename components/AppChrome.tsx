"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { AppShell } from "@/components/layout";

function shouldUseAppShell(pathname: string | null) {
  if (!pathname) return true;
  if (pathname === "/") return false;
  if (pathname.startsWith("/auth")) return false;
  return true;
}

export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useAuthenticator((context) => [context.signOut]);

  async function handleSignOut() {
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore network errors – still run Amplify signOut
    } finally {
      await signOut();
      window.location.href = "/auth";
    }
  }

  if (!shouldUseAppShell(pathname)) {
    return <>{children}</>;
  }

  return <AppShell onSignOut={handleSignOut}>{children}</AppShell>;
}
