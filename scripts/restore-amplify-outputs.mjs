// Copy ~/.fiapp-amplify-outputs-backup.json back into the repo root as
// amplify_outputs.json. Used to recover from accidental deletion / stub overwrite.
import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";

const src = resolve(homedir(), ".fiapp-amplify-outputs-backup.json");
const dest = resolve(process.cwd(), "amplify_outputs.json");

if (!existsSync(src)) {
  console.error(`ERROR: No backup found at ${src}`);
  console.error("");
  console.error("  Download amplify_outputs.json from the staging Amplify build artifact:");
  console.error("    AWS Amplify Console -> fiapp app -> staging branch -> latest build");
  console.error("  Drop it into the repo root, then run: npm run backup:amplify");
  process.exit(1);
}

copyFileSync(src, dest);
console.log(`Restored amplify_outputs.json from ${src}`);
