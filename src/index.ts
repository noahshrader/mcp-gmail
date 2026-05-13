import { pathToFileURL } from 'node:url';

export const STARTUP_MESSAGE = 'mcp-gmail Phase 1 adapter workspace initialized';

export function getStartupMessage(): string {
  return STARTUP_MESSAGE;
}

export function main(): void {
  process.stdout.write(`${getStartupMessage()}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}