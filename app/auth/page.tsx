import AuthGate from "@/components/AuthGate";
import AuthenticatorWrapper from "@/components/AuthenticatorWrapper";

export default function AuthPage() {
  return (
    <AuthGate>
      <AuthenticatorWrapper />
    </AuthGate>
  );
}
