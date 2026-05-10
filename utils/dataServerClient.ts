import type { Schema } from "@/amplify/data/resource";
import { amplifyOutputs } from "@/lib/amplifyConfig";
import { cookies } from "next/headers";
import { generateServerClientUsingCookies } from "@aws-amplify/adapter-nextjs/data";

// IMPORTANT: create the client per-request, inside route handlers
export function getDataClient() {
  return generateServerClientUsingCookies<Schema>({
    config: amplifyOutputs,
    cookies,
  });
}
