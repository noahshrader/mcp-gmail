import { getStartupMessage } from '../index.js';

describe('workspace smoke test', () => {
  it('exposes the startup message', () => {
    expect(getStartupMessage()).toContain('mcp-gmail');
  });
});