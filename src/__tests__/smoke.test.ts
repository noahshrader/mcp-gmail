import { createServer } from '../server/server.js';

describe('workspace smoke test', () => {
  it('creates the MCP server', () => {
    const server = createServer({ adapterVersion: 'test-version' });

    expect(server).toBeDefined();
    expect(server.server).toBeDefined();
  });
});