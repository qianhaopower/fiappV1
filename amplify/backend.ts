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

const fiappMainTable = new aws_dynamodb.Table(externalDataSourcesStack, "FIAPP_MAIN", {
  tableName: "FIAPP_MAIN",
  partitionKey: { name: "PK", type: aws_dynamodb.AttributeType.STRING },
  sortKey: { name: "SK", type: aws_dynamodb.AttributeType.STRING },
  billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
  removalPolicy: RemovalPolicy.DESTROY, // sandbox only; switch to RETAIN for prod
});

// IMPORTANT: This string is the DataSource name your schema must reference
backend.data.addDynamoDbDataSource("FIAppMainDataSource", fiappMainTable);
