"use client";

import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";

let configured = false;

export default function ConfigureAmplifyClientSide() {
  if (!configured) {
    Amplify.configure(outputs, { ssr: true });
    configured = true;
  }
  return null;
}
