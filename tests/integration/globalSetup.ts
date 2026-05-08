// eslint-disable-next-line @typescript-eslint/no-require-imports
const createDynalite = require("dynalite");

let server: { listen: (port: number, cb: (err?: Error) => void) => void; close: (cb: () => void) => void };

export default async function globalSetup() {
  server = createDynalite({ createTableMs: 0 });

  await new Promise<void>((resolve, reject) => {
    server.listen(18000, (err: Error | undefined) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Set env vars here so they are inherited by all forked test processes
  process.env.AWS_ENDPOINT_URL_DYNAMODB = "http://127.0.0.1:18000";
  process.env.FIAPP_AWS_ACCESS_KEY_ID = "test";
  process.env.FIAPP_AWS_SECRET_ACCESS_KEY = "test";
  process.env.AWS_REGION = "ap-southeast-2";

  return async function teardown() {
    await new Promise<void>((resolve) => server.close(resolve));
  };
}
