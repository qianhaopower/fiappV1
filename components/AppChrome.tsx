"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { AppShell } from "@/components/layout";
import { ProfileProvider } from "@/contexts/ProfileContext";

function shouldUseAppShell(pathname: string | null, isAuthed: boolean) {
  if (!pathname) return true;
  if (pathname === "/") return false;
  if (pathname.startsWith("/auth")) return false;
  if (pathname === "/privacy") return false;
  if (pathname === "/terms") return false;
  if (pathname === "/contact") return false;
  if (pathname === "/disclaimer") return false;
  if (pathname === "/faq") return false;
  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/onboarding")) return false;
  if (pathname.startsWith("/payment")) return false;
  // Anonymous funnel: /assessment and /results are public. When a visitor is
  // unauthenticated, skip the AppShell — its nav links (Today/Practices/etc)
  // would all 302 to /auth. Authed visitors still get the shell here.
  if (!isAuthed && (pathname.startsWith("/assessment") || pathname.startsWith("/results"))) {
    return false;
  }
  return true;
}

export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { authStatus, signOut } = useAuthenticator((context) => [
    context.authStatus,
    context.signOut,
  ]);
  const isAuthed = authStatus === "authenticated";

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
      {!shouldUseAppShell(pathname, isAuthed) ? (
        <>{children}</>
      ) : (
        <AppShell onSignOut={handleSignOut}>{children}</AppShell>
      )}
    </ProfileProvider>
  );
}
