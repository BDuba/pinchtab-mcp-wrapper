import { ToolWithHandler } from '../../types/index.js';
import { PinchtabClient } from '../../client/pinchtab-client.js';

export function registerReadPageTool(tools: Map<string, ToolWithHandler>): void {
  const tool: ToolWithHandler = {
    name: 'read_page',
    description: 'Read page content as clean text (token-efficient)',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          type: 'string',
          description: 'Tab ID (optional, uses active tab if not specified)',
        },
        mode: {
          type: 'string',
          enum: ['readability', 'raw'],
          description: 'Text extraction mode',
        },
      },
      required: [],
    },
    handler: async (params: unknown, client: unknown) => {
      const p = params as { tabId?: string; mode?: string };
      const result = await (client as PinchtabClient).text(p.tabId, p.mode);
      return {
        url: result.url,
        title: result.title,
        content: result.content,
      };
    },
  };

  tools.set(tool.name, tool);
}
