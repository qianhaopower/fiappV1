// utils/amplifyServerUtils.ts
import { createServerRunner } from "@aws-amplify/adapter-nextjs";
import { amplifyOutputs } from "@/lib/amplifyConfig";


export const { runWithAmplifyServerContext } = createServerRunner({
  config: amplifyOutputs,
});
