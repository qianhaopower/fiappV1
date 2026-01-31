"use client";

import { useAuthenticator } from "@aws-amplify/ui-react";

export default function Home() {
  const { user, signOut } = useAuthenticator((context) => [
    context.user,
    context.signOut,
  ]);

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>FIApp v1</h1>

      <div style={{ marginTop: 12 }}>
        <div style={{ opacity: 0.8, marginBottom: 8 }}>Signed in as</div>
        <div style={{ fontFamily: "monospace" }}>
          {user?.signInDetails?.loginId ?? user?.username ?? "(unknown)"}
        </div>
      </div>

      <button
        onClick={signOut}
        style={{
          marginTop: 16,
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid #ccc",
          cursor: "pointer",
        }}
      >
        Sign out
      </button>
    </main>
  );
}
