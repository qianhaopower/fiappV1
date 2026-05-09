// amplify/backend.ts
import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { preSignUpTrigger } from "./auth/pre-sign-up-trigger/resource";
import { Aws, aws_dynamodb, aws_iam, RemovalPolicy } from "aws-cdk-lib";

export const backend = defineBackend({
  auth,
  data,
  preSignUpTrigger,
});

const externalDataSourcesStack = backend.createStack("FIAppExternalDataSources");

const branch = process.env.AWS_BRANCH ?? "main";
const isProduction = branch === "main";
const mainTableName = isProduction ? "FIAPP_MAIN" : `FIAPP_MAIN_${branch.toUpperCase()}`;
const returnsTableName = isProduction ? "FIAPP_RETURNS" : `FIAPP_RETURNS_${branch.toUpperCase()}`;

// Production: import the existing table (created by the original sandbox stack).
// All other branches: create a fresh table scoped to that branch.
const fiappMainTable = isProduction
  ? aws_dynamodb.Table.fromTableName(externalDataSourcesStack, "FIAPP_MAIN", mainTableName)
  : new aws_dynamodb.Table(externalDataSourcesStack, "FIAPP_MAIN", {
      tableName: mainTableName,
      partitionKey: { name: "PK", type: aws_dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: aws_dynamodb.AttributeType.STRING },
      billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    });

// IMPORTANT: This string is the DataSource name your schema must reference
backend.data.addDynamoDbDataSource("FIAppMainDataSource", fiappMainTable);

// Production: import the existing table so stack deletion never conflicts with RETAIN.
// All other branches: create a fresh table scoped to that branch.
isProduction
  ? aws_dynamodb.Table.fromTableName(externalDataSourcesStack, "FIAPP_RETURNS", returnsTableName)
  : new aws_dynamodb.Table(externalDataSourcesStack, "FIAPP_RETURNS", {
      tableName: returnsTableName,
      partitionKey: { name: "PK", type: aws_dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: aws_dynamodb.AttributeType.STRING },
      billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    });

// Grant the Pre-Sign-Up Lambda permission to list and link users in the Cognito
// user pool. Required for both account-linking directions in handler.ts.
backend.preSignUpTrigger.resources.lambda.addToRolePolicy(
  new aws_iam.PolicyStatement({
    actions: [
      "cognito-idp:ListUsers",
      "cognito-idp:AdminLinkProviderForUser",
    ],
    resources: [`arn:aws:cognito-idp:${Aws.REGION}:${Aws.ACCOUNT_ID}:userpool/*`],
  })
);
