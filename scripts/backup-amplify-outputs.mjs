// Copy the current amplify_outputs.json to ~/.fiapp-amplify-outputs-backup.json
// so it can be restored with `npm run restore:amplify`.
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";

const src = resolve(process.cwd(), "amplify_outputs.json");
const dest = resolve(homedir(), ".fiapp-amplify-outputs-backup.json");

if (!existsSync(src)) {
  console.error("ERROR: No amplify_outputs.json found in repo root.");
  process.exit(1);
}

const raw = readFileSync(src, "utf8");
if (raw.includes("stubclient") || raw.includes("stubpool")) {
  console.error("ERROR: Refusing to back up — amplify_outputs.json contains stub values.");
  console.error("  Restore real values first, then run: npm run backup:amplify");
  process.exit(1);
}

copyFileSync(src, dest);
console.log(`Backed up amplify_outputs.json -> ${dest}`);
