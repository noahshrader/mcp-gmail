import { describe, expect, it } from 'vitest';

import { idSchema, labelIdSchema, querySchema } from '../schemas.js';

describe('server tool schemas', () => {
  it('strips null bytes from search queries', () => {
    expect(querySchema.parse('  in:inbox\u0000  ')).toBe('in:inbox');
  });

  it('rejects IDs with spaces', () => {
    expect(() => idSchema.parse('bad id')).toThrow();
  });

  it('accepts valid Gmail label IDs', () => {
    expect(labelIdSchema.parse('INBOX')).toBe('INBOX');
    expect(labelIdSchema.parse('Label_123')).toBe('Label_123');
  });
});