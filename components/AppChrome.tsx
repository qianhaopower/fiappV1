"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { AppShell } from "@/components/layout";
import { ProfileProvider } from "@/contexts/ProfileContext";

function shouldUseAppShell(pathname: string | null) {
  if (!pathname) return true;
  if (pathname === "/") return false;
  if (pathname.startsWith("/auth")) return false;
  if (pathname === "/privacy") return false;
  if (pathname === "/terms") return false;
  if (pathname === "/contact") return false;
  if (pathname === "/disclaimer") return false;
  if (pathname.startsWith("/payment")) return false;
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

  return (
    <ProfileProvider>
      {!shouldUseAppShell(pathname) ? (
        <>{children}</>
      ) : (
        <AppShell onSignOut={handleSignOut}>{children}</AppShell>
      )}
    </ProfileProvider>
  );
}
