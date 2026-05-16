// Predev guard: refuse to start the dev server if amplify_outputs.json is
// missing or contains stub values. Local auth fails silently with the stub,
// producing the confusing "User pool client stubclient does not exist" error.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const target = resolve(process.cwd(), "amplify_outputs.json");

function fail(message) {
  console.error("");
  console.error("------------------------------------------------------------------------");
  console.error("  amplify_outputs.json is not usable for local dev");
  console.error("");
  console.error("  " + message);
  console.error("");
  console.error("  To restore real values:");
  console.error("    1. npm run restore:amplify");
  console.error("         (uses ~/.fiapp-amplify-outputs-backup.json if present)");
  console.error("");
  console.error("    2. Otherwise, download from AWS Amplify Console:");
  console.error("         fiapp app -> staging branch -> latest build -> artifacts");
  console.error("       Drop amplify_outputs.json into the repo root, then run:");
  console.error("         npm run backup:amplify");
  console.error("");
  console.error("  To bypass this check (not recommended): run `next dev` directly.");
  console.error("------------------------------------------------------------------------");
  console.error("");
  process.exit(1);
}

if (!existsSync(target)) {
  fail("File is missing.");
}

const raw = readFileSync(target, "utf8");
if (raw.includes("stubclient") || raw.includes("stubpool")) {
  fail("File contains stub values (stubclient / stubpool).");
}
