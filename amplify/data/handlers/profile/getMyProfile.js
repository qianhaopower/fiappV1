import * as ddb from "@aws-appsync/utils/dynamodb";
import { util } from "@aws-appsync/utils";

export function request(ctx) {
  const sub = ctx.identity && ctx.identity.sub;
  if (!sub) util.unauthorized();

  return ddb.get({
    key: {
      PK: `USER#${sub}`,
      SK: "PROFILE",
    },
  });
}

export function response(ctx) {
  return ctx.result || null;
}
