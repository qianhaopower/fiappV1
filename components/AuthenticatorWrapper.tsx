"use client";

import { Authenticator } from "@aws-amplify/ui-react";
import { signOut as amplifySignOut } from "aws-amplify/auth";

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
        <>
          <button
            onClick={handleSignOut}
            style={{ position: "absolute", top: 12, right: 12 }}
          >
            Sign out
          </button>
          {children}
        </>
      )}
    </Authenticator>
  );
}
