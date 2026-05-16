#!/usr/bin/env node
// Backfill USERS#INDEX entries for every existing profile in a FIAPP_MAIN
// table. Run once per environment (staging + main) after deploying the
// users-index code. Uses your local AWS credentials, which have the full
// access needed for dynamodb:Scan — the SSR runtime does not.
//
// Usage:
//   node scripts/backfill-users-index.mjs --table FIAPP_MAIN --region ap-southeast-2
//   node scripts/backfill-users-index.mjs --table FIAPP_MAIN --dry-run
//
// Flags:
//   --table <name>    DynamoDB table name (required)
//   --region <name>   AWS region (default: ap-southeast-2)
//   --dry-run         Show what would be written without writing
//
// Make sure AWS credentials are set in your environment first (e.g. via
// AWS_PROFILE or AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY).

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

const args = process.argv.slice(2);

function getFlag(name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  return args[i + 1];
}

const table = getFlag("--table");
const region = getFlag("--region") ?? "ap-southeast-2";
const dryRun = args.includes("--dry-run");

if (!table) {
  console.error("Missing --table flag.");
  console.error("Usage: node scripts/backfill-users-index.mjs --table FIAPP_MAIN [--region ap-southeast-2] [--dry-run]");
  process.exit(1);
}

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

async function scanAllProfiles() {
  const items = [];
  let ExclusiveStartKey;
  do {
    const out = await client.send(
      new ScanCommand({
        TableName: table,
        FilterExpression: "SK = :sk AND begins_with(PK, :pk)",
        ExpressionAttributeValues: { ":sk": "PROFILE", ":pk": "USER#" },
        ExclusiveStartKey,
      })
    );
    if (out.Items) items.push(...out.Items);
    ExclusiveStartKey = out.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

console.log(`[backfill] table=${table} region=${region} dryRun=${dryRun}`);
console.log("[backfill] scanning profiles…");
const profiles = await scanAllProfiles();
console.log(`[backfill] found ${profiles.length} profiles`);

let written = 0;
let skipped = 0;
for (const p of profiles) {
  const userId = String(p.PK ?? "").replace(/^USER#/, "");
  if (!userId) {
    skipped++;
    continue;
  }
  const item = {
    PK: "USERS",
    SK: `INDEX#${userId}`,
    userId,
    createdAt: p.createdAt ?? new Date().toISOString(),
  };

  if (dryRun) {
    console.log(`[backfill] (dry) would write INDEX#${userId}`);
    written++;
    continue;
  }

  try {
    await client.send(
      new PutCommand({
        TableName: table,
        Item: item,
        ConditionExpression: "attribute_not_exists(PK)",
      })
    );
    written++;
  } catch (e) {
    if (e?.name === "ConditionalCheckFailedException") {
      skipped++;
    } else {
      console.error(`[backfill] failed for ${userId}:`, e?.name, e?.message);
      throw e;
    }
  }
}

console.log(`[backfill] done. written=${written} skipped=${skipped}`);
