import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/**
 * FIAPP_MAIN — Profile access via custom resolvers
 * - Single-table design (PK/SK)
 * - Server-authoritative identity (ctx.identity.sub)
 */

const schema = a.schema({
  /**
   * Custom type returned by getMyProfile
   */
  Profile: a.customType({
    userId: a.string().required(),
    subscriptionStatus: a.string().required(), // FREE | PAID
    createdAt: a.string().required(),
    updatedAt: a.string().required(),
  }),

  /**
   * Query: fetch *my* profile
   */
  getMyProfile: a
    .query()
    .returns(a.ref("Profile"))
    .authorization((allow) => [allow.authenticated()])
    .handler(
      a.handler.custom({
        dataSource: "FIAppMainDataSource",
        entry: "./handlers/profile/getMyProfile.js",
      })
    ),

  /**
   * Mutation: create *my* profile (idempotent-ish)
   */
  createMyProfile: a
    .mutation()
    .returns(a.ref("Profile"))
    .authorization((allow) => [allow.authenticated()])
    .handler(
      a.handler.custom({
        dataSource: "FIAppMainDataSource",
        entry: "./handlers/profile/createMyProfile.js",
      })
    ),

  /**
   * Mutation: set *my* subscription status
   * Returns boolean; caller re-reads profile
   */
  setMySubscriptionStatus: a
    .mutation()
    .arguments({
      subscriptionStatus: a.string().required(), // FREE | PAID
    })
    .returns(a.boolean())
    .authorization((allow) => [allow.authenticated()])
    .handler(
      a.handler.custom({
        dataSource: "FIAppMainDataSource",
        entry: "./handlers/profile/setMySubscriptionStatus.js",
      })
    ),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
