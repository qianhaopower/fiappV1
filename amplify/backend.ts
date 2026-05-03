// amplify/backend.ts
import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { aws_dynamodb, RemovalPolicy } from "aws-cdk-lib";

export const backend = defineBackend({
  auth,
  data,
});

const externalDataSourcesStack = backend.createStack("FIAppExternalDataSources");

// FIAPP_MAIN was created by the sandbox stack — import it so the production stack
// references the existing table instead of trying to create a duplicate.
const fiappMainTable = aws_dynamodb.Table.fromTableName(
  externalDataSourcesStack,
  "FIAPP_MAIN",
  "FIAPP_MAIN"
);

// IMPORTANT: This string is the DataSource name your schema must reference
backend.data.addDynamoDbDataSource("FIAppMainDataSource", fiappMainTable);

// Returns table — created and owned by the production pipeline.
new aws_dynamodb.Table(externalDataSourcesStack, "FIAPP_RETURNS", {
  tableName: "FIAPP_RETURNS",
  partitionKey: { name: "PK", type: aws_dynamodb.AttributeType.STRING },
  sortKey: { name: "SK", type: aws_dynamodb.AttributeType.STRING },
  billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
  removalPolicy: RemovalPolicy.RETAIN,
});
