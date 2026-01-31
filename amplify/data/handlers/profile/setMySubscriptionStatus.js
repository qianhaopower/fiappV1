import { util } from "@aws-appsync/utils";

export function request(ctx) {
  const sub = ctx.identity && ctx.identity.sub;
  if (!sub) util.unauthorized();

  const subscriptionStatus = ctx.args.subscriptionStatus;
  const now = util.time.nowISO8601();

  return {
    operation: "UpdateItem",
    key: util.dynamodb.toMapValues({
      PK: `USER#${sub}`,
      SK: "PROFILE",
    }),
    update: {
      expression: "SET #ss = :s, #ua = :u",
      expressionNames: {
        "#ss": "subscriptionStatus",
        "#ua": "updatedAt",
      },
      expressionValues: util.dynamodb.toMapValues({
        ":s": subscriptionStatus,
        ":u": now,
      }),
    },
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  // If you're on Option A (returns boolean), return true.
  // If you kept Profile return type, ctx.result may be partial.
  return true;
}
