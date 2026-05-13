import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';

const SKILLS_LIST_URI = 'gmail://skills';

export function registerSkillResources(server: McpServer): void {
  server.registerResource(
    'skills_list',
    SKILLS_LIST_URI,
    {
      description: 'List available Gmail skills',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: SKILLS_LIST_URI,
          mimeType: 'application/json',
          text: JSON.stringify({ skills: [] }, null, 2),
        },
      ],
    })
  );

  server.registerResource(
    'skills_read',
    new ResourceTemplate('gmail://skills/{name}', { list: undefined }),
    {
      description: 'Read a Gmail skill definition',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const name = typeof variables.name === 'string' ? variables.name : 'unknown';

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                error: `Skill not found: ${name}`,
                code: 'skills/not_found',
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}