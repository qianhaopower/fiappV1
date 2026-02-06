"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Authenticator } from "@aws-amplify/ui-react";
import { ensureAmplifyConfigured } from "@/lib/amplifyClient";

function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/decideRoute");
  }, [router]);

  return (
    <div className="py-4 text-center text-sm text-muted-foreground">
      Redirecting...
    </div>
  );
}

export default function AuthenticatorWrapper() {
  ensureAmplifyConfigured();

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-xl p-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-foreground">
            FRIENDS Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Sign in to continue your journey
          </p>
        </div>

        <div className="fiapp-auth-shell">
          <Authenticator
            className="fiapp-auth"
            formFields={{
              signIn: {
                username: {
                  placeholder: "name@email.com",
                },
                password: {
                  placeholder: "••••••••",
                },
              },
              signUp: {
                email: {
                  order: 1,
                  placeholder: "name@email.com",
                },
                password: {
                  order: 2,
                  placeholder: "••••••••",
                },
                confirm_password: {
                  order: 3,
                  placeholder: "••••••••",
                },
              },
            }}
            components={{
              SignIn: {
                Footer: () => (
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    We’ll never share your data.
                  </p>
                ),
              },
            }}
          >
            {({ user }) => (user ? <AuthRedirect /> : <></>)}
          </Authenticator>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <a href="/" className="text-muted-foreground hover:text-foreground">
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
