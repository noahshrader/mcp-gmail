import { describe, expect, it } from 'vitest';

import { GmailInvalidInputError } from '../../../gmail/errors.js';
import { runTool } from '../shared.js';

describe('runTool', () => {
  it('returns typed Gmail error codes', async () => {
    const result = await runTool(async () => {
      throw new GmailInvalidInputError('Bad request');
    }, 'gmail/fallback');

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      error: 'Bad request',
      code: 'gmail/invalid_input',
    });
  });

  it('normalizes raw API errors', async () => {
    const result = await runTool(async () => {
      throw Object.assign(new Error('Missing'), { status: 404 });
    }, 'gmail/fallback');

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({ code: 'gmail/not_found' });
  });
});