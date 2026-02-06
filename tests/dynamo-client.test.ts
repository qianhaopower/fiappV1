import { describe, it, expect, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { createDynamoClient } from "@/utils/dynamoClient";

const ddbMock = mockClient(DynamoDBDocumentClient);

describe("DynamoClient wrapper", () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  it("uses the wrapper to put and get items", async () => {
    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(GetCommand).resolves({ Item: { PK: "USER#1", SK: "PROFILE" } });

    const client = createDynamoClient({ tableName: "FIAPP_MAIN" });
    await client.putItem({ PK: "USER#1", SK: "PROFILE" });
    const item = await client.getItem<{ PK: string; SK: string }>({
      PK: "USER#1",
      SK: "PROFILE",
    });

    expect(item).toEqual({ PK: "USER#1", SK: "PROFILE" });
    expect(ddbMock.commandCalls(PutCommand).length).toBe(1);
    expect(ddbMock.commandCalls(GetCommand).length).toBe(1);
  });
});
