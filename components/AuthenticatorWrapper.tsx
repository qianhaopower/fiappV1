"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react";
import { ensureAmplifyConfigured } from "@/lib/amplifyClient";

const passwordSettings = {
  minLength: 8,
  requireLowercase: true,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecialCharacters: true,
};

function PasswordRequirements() {
  return (
    <p className="mt-2 text-xs leading-5 text-muted-foreground">
      Passwords need 8+ characters with uppercase, lowercase, a number, and a
      symbol.
    </p>
  );
}

function SignInFooter() {
  const { toForgotPassword } = useAuthenticator();
  return (
    <div className="mt-3 flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={toForgotPassword}
        className="text-xs text-primary hover:text-primary/80 font-medium"
      >
        Forgot password?
      </button>
      <p className="text-xs text-muted-foreground">
        We&apos;ll never share your data.
      </p>
    </div>
  );
}

function SignUpFormFields() {
  return (
    <>
      <Authenticator.SignUp.FormFields />
      <PasswordRequirements />
    </>
  );
}

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
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-xl p-6 sm:p-12">
        <div className="text-center mb-6 sm:mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="Friends Intelligence" className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Friends Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Sign in to continue your journey
          </p>
          <p className="text-xs text-muted-foreground mt-3 max-w-sm mx-auto leading-5">
            An account saves your assessment results and practice progress so you can pick up where you left off. We only store your email and your responses — nothing is shared or sold.
          </p>
        </div>

        <div className="fiapp-auth-shell">
          <Authenticator
            className="fiapp-auth"
            socialProviders={['google']}
            passwordSettings={passwordSettings}
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
                Footer: SignInFooter,
              },
              SignUp: {
                FormFields: SignUpFormFields,
              },
            }}
          >
            {({ user }) => (user ? <AuthRedirect /> : <></>)}
          </Authenticator>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground space-y-2">
          <div>
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              ← Back to home
            </Link>
          </div>
          <div className="flex justify-center gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/disclaimer" className="hover:text-foreground transition-colors">Disclaimer</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
