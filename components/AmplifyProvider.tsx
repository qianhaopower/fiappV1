"use client";

import { Authenticator } from "@aws-amplify/ui-react";
import { ensureAmplifyConfigured } from "@/lib/amplifyClient";

interface AmplifyProviderProps {
  children: React.ReactNode;
}

export default function AmplifyProvider({ children }: AmplifyProviderProps) {
  ensureAmplifyConfigured();
  return <Authenticator.Provider>{children}</Authenticator.Provider>;
}
