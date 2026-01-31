import * as ddb from "@aws-appsync/utils/dynamodb";
import { util } from "@aws-appsync/utils";

export function request(ctx) {
  const sub = ctx.identity && ctx.identity.sub;
  if (!sub) util.unauthorized();

  const now = util.time.nowISO8601();

  const key = { PK: `USER#${sub}`, SK: "PROFILE" };

  const item = {
    ...key,
    userId: sub,
    subscriptionStatus: "FREE",
    createdAt: now,
    updatedAt: now,
  };

  const req = ddb.put({ key, item });

  // Don’t overwrite if it already exists
  req.condition = {
    expression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
  };

  return req;
}

export function response(ctx) {
  return ctx.result;
}
