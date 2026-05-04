import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { createDynamoClient, createReturnsClient } from "@/utils/dynamoClient";

const ddbMock = mockClient(DynamoDBDocumentClient);

describe("DynamoClient wrapper", () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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

  it("defaults to the Amplify main table name when env is absent", async () => {
    vi.stubEnv("FIAPP_MAIN_TABLE", "");
    ddbMock.on(GetCommand).resolves({ Item: { PK: "USER#1", SK: "PROFILE" } });

    const client = createDynamoClient();
    await client.getItem({ PK: "USER#1", SK: "PROFILE" });

    expect(ddbMock.commandCalls(GetCommand)[0].firstArg.input.TableName).toBe("FIAPP_MAIN");
  });

  it("defaults returns reads to the Amplify returns table name when env is absent", async () => {
    vi.stubEnv("FIAPP_MAIN_TABLE", "");
    vi.stubEnv("FIAPP_RETURNS_TABLE", "");
    ddbMock.on(GetCommand).resolves({ Item: { PK: "USER#1", SK: "DATE#2026-05-04" } });

    const client = createReturnsClient();
    await client.getItem({ PK: "USER#1", SK: "DATE#2026-05-04" });

    expect(ddbMock.commandCalls(GetCommand)[0].firstArg.input.TableName).toBe("FIAPP_RETURNS");
  });
});
