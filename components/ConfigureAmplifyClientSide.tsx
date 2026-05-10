"use client";

import { Amplify } from "aws-amplify";
import { amplifyOutputs } from "@/lib/amplifyConfig";

let configured = false;

export default function ConfigureAmplifyClientSide() {
  if (!configured) {
    Amplify.configure(amplifyOutputs, { ssr: true });
    configured = true;
  }
  return null;
}
