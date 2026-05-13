import { pathToFileURL } from 'node:url';

import { buildCli } from './program.js';
import type { CliDependencies } from './types.js';

export async function main(
  argv: string[] = process.argv,
  overrides: Partial<CliDependencies> = {}
): Promise<void> {
  const program = buildCli(overrides);

  try {
    await program.parseAsync(argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}