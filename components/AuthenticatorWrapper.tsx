"use client";

import { Authenticator } from "@aws-amplify/ui-react";
import { signOut as amplifySignOut } from "aws-amplify/auth";
import { AppShell } from "@/components/layout";

export default function AuthenticatorWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    await amplifySignOut();
    window.location.href = "/";
  }

  return (
    <Authenticator>
      {() => (
        <AppShell onSignOut={handleSignOut}>
          {children}
        </AppShell>
      )}
    </Authenticator>
  );
}
