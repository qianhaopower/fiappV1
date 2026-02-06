import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  type GetCommandInput,
  type PutCommandInput,
  type UpdateCommandInput,
  type QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";

export interface DynamoClientOptions {
  tableName?: string;
  region?: string;
  client?: DynamoDBDocumentClient;
}

export class DynamoClient {
  private tableName: string;
  private client: DynamoDBDocumentClient;

  constructor(options: DynamoClientOptions = {}) {
    const tableName = options.tableName ?? process.env.FIAPP_MAIN_TABLE;
    if (!tableName) {
      throw new Error("FIAPP_MAIN_TABLE is not set");
    }

    this.tableName = tableName;
    this.client =
      options.client ??
      DynamoDBDocumentClient.from(
        new DynamoDBClient({
          region: options.region ?? process.env.AWS_REGION ?? "ap-southeast-2",
        })
      );
  }

  async getItem<T>(key: Record<string, string>) {
    const input: GetCommandInput = {
      TableName: this.tableName,
      Key: key,
    };
    const result = await this.client.send(new GetCommand(input));
    return result.Item as T | undefined;
  }

  async putItem(item: Record<string, unknown>) {
    const input: PutCommandInput = {
      TableName: this.tableName,
      Item: item,
    };
    await this.client.send(new PutCommand(input));
  }

  async updateItem(input: Omit<UpdateCommandInput, "TableName">) {
    await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        ...input,
      })
    );
  }

  async query<T>(input: Omit<QueryCommandInput, "TableName">) {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        ...input,
      })
    );
    return (result.Items ?? []) as T[];
  }
}

export function createDynamoClient(options: DynamoClientOptions = {}) {
  return new DynamoClient(options);
}