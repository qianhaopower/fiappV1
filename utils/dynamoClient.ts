import { DynamoDBClient, ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
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

const DEFAULT_MAIN_TABLE = "FIAPP_MAIN";
const DEFAULT_RETURNS_TABLE = "FIAPP_RETURNS";

function firstConfiguredValue(
  fallback: string,
  ...values: Array<string | undefined>
) {
  return values.find((value) => value?.trim()) ?? fallback;
}

export interface DynamoClientOptions {
  tableName?: string;
  region?: string;
  client?: DynamoDBDocumentClient;
}

export class DynamoClient {
  private tableName: string;
  private client: DynamoDBDocumentClient;

  constructor(options: DynamoClientOptions = {}) {
    const tableName = firstConfiguredValue(
      DEFAULT_MAIN_TABLE,
      options.tableName,
      process.env.FIAPP_MAIN_TABLE
    );

    this.tableName = tableName;
    const accessKeyId = process.env.FIAPP_AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.FIAPP_AWS_SECRET_ACCESS_KEY
    const region = options.region
      ?? process.env.FIAPP_AWS_REGION
      ?? process.env.AWS_REGION
      ?? "ap-southeast-2"

    this.client =
      options.client ??
      DynamoDBDocumentClient.from(
        new DynamoDBClient({
          region,
          ...(accessKeyId && secretAccessKey
            ? { credentials: { accessKeyId, secretAccessKey } }
            : {}),
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

  async putItemIfNotExists(item: Record<string, unknown>): Promise<boolean> {
    try {
      const input: PutCommandInput = {
        TableName: this.tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK)',
      }
      await this.client.send(new PutCommand(input))
      return true
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) return false
      throw error
    }
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

export function createReturnsClient(options: Omit<DynamoClientOptions, 'tableName'> = {}) {
  const tableName = firstConfiguredValue(
    DEFAULT_RETURNS_TABLE,
    process.env.FIAPP_RETURNS_TABLE,
    process.env.FIAPP_MAIN_TABLE
  );
  return new DynamoClient({ ...options, tableName });
}
