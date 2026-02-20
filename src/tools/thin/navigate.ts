import { ToolWithHandler } from '../../types/index.js';
import { PinchtabClient } from '../../client/pinchtab-client.js';

export function registerNavigateTool(tools: Map<string, ToolWithHandler>): void {
  const tool: ToolWithHandler = {
    name: 'navigate',
    description: 'Navigate a tab to a URL',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          type: 'string',
          description: 'Tab ID to navigate',
        },
        url: {
          type: 'string',
          description: 'URL to navigate to',
        },
      },
      required: ['tabId', 'url'],
    },
    handler: async (params: unknown, client: unknown) => {
      const p = params as { tabId: string; url: string };
      const result = await (client as PinchtabClient).navigate(p.tabId, p.url);
      return result;
    },
  };

  tools.set(tool.name, tool);
}
