import type { Schema } from "@/amplify/data/resource";
import outputs from "@/amplify_outputs.json";
import { cookies } from "next/headers";
import { generateServerClientUsingCookies } from "@aws-amplify/adapter-nextjs/data";

// IMPORTANT: create the client per-request, inside route handlers
export function getDataClient() {
  return generateServerClientUsingCookies<Schema>({
    config: outputs,
    cookies,
  });
}
