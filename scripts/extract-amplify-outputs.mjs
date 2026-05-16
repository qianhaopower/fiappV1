// Extract a real amplify_outputs.json from a downloaded staging Amplify build
// artifact. The Amplify Hosting build inlines the config into compiled JS;
// this script finds the JS object literal, parses it, and writes a clean
// JSON file to the repo root.
//
// Usage:
//   node scripts/extract-amplify-outputs.mjs /path/to/Deployment-NN-artifacts
//
// Or via npm script:
//   npm run extract:amplify -- /path/to/Deployment-NN-artifacts
//
// After extracting, run `npm run backup:amplify` to stash a copy.
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const artifactDir = process.argv[2];
if (!artifactDir) {
  console.error("ERROR: artifact directory required.");
  console.error("Usage: node scripts/extract-amplify-outputs.mjs /path/to/Deployment-NN-artifacts");
  process.exit(1);
}
if (!existsSync(artifactDir) || !statSync(artifactDir).isDirectory()) {
  console.error(`ERROR: not a directory: ${artifactDir}`);
  process.exit(1);
}

// The config is inlined into Next.js server chunks. Search for the file
// containing the unique user_pool_id pattern.
const chunksDir = join(artifactDir, "compute/default/.next/server/chunks");
if (!existsSync(chunksDir)) {
  console.error(`ERROR: expected Next.js chunks at ${chunksDir}`);
  console.error("  Is this an Amplify Hosting Next.js artifact?");
  process.exit(1);
}

const POOL_PATTERN = /\{user_pool_id:"ap-southeast-2_[A-Za-z0-9]+"/;
let sourceFile = null;
let text = null;
for (const entry of readdirSync(chunksDir)) {
  if (!entry.endsWith(".js")) continue;
  const path = join(chunksDir, entry);
  const candidate = readFileSync(path, "utf8");
  if (POOL_PATTERN.test(candidate)) {
    sourceFile = path;
    text = candidate;
    break;
  }
}
if (!sourceFile) {
  console.error("ERROR: could not find compiled chunk containing the inlined Amplify config.");
  process.exit(1);
}
console.log(`Source chunk: ${sourceFile}`);

const m = text.match(POOL_PATTERN);
const startIdx = m.index;

// The OUTER object that wraps both `auth` and `data` starts at the nearest
// `{` before `auth:{` before our match.
const authPropStart = text.lastIndexOf("auth:{", startIdx);
if (authPropStart === -1) {
  console.error("ERROR: could not find `auth:{` prop before user_pool_id match.");
  process.exit(1);
}
const outerStart = text.lastIndexOf("{", authPropStart);
if (outerStart === -1) {
  console.error("ERROR: could not find outer brace.");
  process.exit(1);
}

// Walk forward, tracking nested braces and string state, until depth returns to 0.
let depth = 0;
let inStr = false;
let strChar = "";
let escape = false;
let outerEnd = -1;
for (let i = outerStart; i < text.length; i++) {
  const c = text[i];
  if (escape) {
    escape = false;
    continue;
  }
  if (inStr) {
    if (c === "\\") {
      escape = true;
      continue;
    }
    if (c === strChar) {
      inStr = false;
    }
    continue;
  }
  if (c === '"' || c === "'") {
    inStr = true;
    strChar = c;
    continue;
  }
  if (c === "{") depth++;
  else if (c === "}") {
    depth--;
    if (depth === 0) {
      outerEnd = i;
      break;
    }
  }
}
if (outerEnd === -1) {
  console.error("ERROR: could not balance braces — config object may be malformed.");
  process.exit(1);
}

const jsLiteral = text.slice(outerStart, outerEnd + 1);
console.log(`Extracted ${jsLiteral.length} bytes of JS object literal.`);

let parsed;
try {
  // The bundle uses JS object literal syntax (bare keys, !0/!1 booleans).
  // eval is safe here: input is a local file the user just downloaded
  // from their own AWS Amplify Console.
  parsed = eval("(" + jsLiteral + ")");
} catch (err) {
  console.error("ERROR: failed to parse extracted JS literal:", err.message);
  process.exit(1);
}

if (!parsed.version) parsed.version = "1.4";

const dest = resolve(process.cwd(), "amplify_outputs.json");
writeFileSync(dest, JSON.stringify(parsed, null, 2));

const queries = Object.keys(parsed.data?.model_introspection?.queries || {});
const mutations = Object.keys(parsed.data?.model_introspection?.mutations || {});
console.log("");
console.log(`Wrote ${dest}`);
console.log(`  user_pool_id:    ${parsed.auth?.user_pool_id}`);
console.log(`  appsync url:     ${parsed.data?.url}`);
console.log(`  queries:         ${queries.join(", ") || "(none)"}`);
console.log(`  mutations:       ${mutations.join(", ") || "(none)"}`);
console.log("");
console.log("Next: run `npm run backup:amplify` to stash a copy.");
