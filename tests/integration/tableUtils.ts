import {
  DynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand,
} from "@aws-sdk/client-dynamodb";
import { randomUUID } from "crypto";

export function makeRawClient(): DynamoDBClient {
  return new DynamoDBClient({
    region: process.env.AWS_REGION ?? "ap-southeast-2",
    endpoint: process.env.AWS_ENDPOINT_URL_DYNAMODB ?? "http://localhost:8000",
    credentials: {
      accessKeyId: process.env.FIAPP_AWS_ACCESS_KEY_ID ?? "test",
      secretAccessKey: process.env.FIAPP_AWS_SECRET_ACCESS_KEY ?? "test",
    },
  });
}

export function makeTableNames() {
  const id = randomUUID().slice(0, 8);
  return {
    mainTable: `TEST_${id}_FIAPP_MAIN`,
    returnsTable: `TEST_${id}_FIAPP_RETURNS`,
  };
}

const tableSchema = {
  KeySchema: [
    { AttributeName: "PK", KeyType: "HASH" as const },
    { AttributeName: "SK", KeyType: "RANGE" as const },
  ],
  AttributeDefinitions: [
    { AttributeName: "PK", AttributeType: "S" as const },
    { AttributeName: "SK", AttributeType: "S" as const },
  ],
  BillingMode: "PAY_PER_REQUEST" as const,
};

export async function createTables(
  client: DynamoDBClient,
  mainTable: string,
  returnsTable: string
) {
  await Promise.all([
    client.send(new CreateTableCommand({ TableName: mainTable, ...tableSchema })),
    client.send(new CreateTableCommand({ TableName: returnsTable, ...tableSchema })),
  ]);
}

export async function deleteTables(
  client: DynamoDBClient,
  mainTable: string,
  returnsTable: string
) {
  await Promise.all([
    client.send(new DeleteTableCommand({ TableName: mainTable })),
    client.send(new DeleteTableCommand({ TableName: returnsTable })),
  ]);
}
