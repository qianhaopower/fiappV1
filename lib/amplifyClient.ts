import { Amplify } from "aws-amplify";
import { amplifyOutputs } from "@/lib/amplifyConfig";

let configured = false;

export function ensureAmplifyConfigured() {
  if (configured) return;
  Amplify.configure(amplifyOutputs, { ssr: true });
  configured = true;
}
