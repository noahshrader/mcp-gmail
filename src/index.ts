import { pathToFileURL } from 'node:url';

import { startServer } from './server/server.js';

export async function main(): Promise<void> {
  await startServer();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}