import { ToolWithHandler } from '../../types/index.js';
import { PinchtabClient } from '../../client/pinchtab-client.js';

export function registerTextTool(tools: Map<string, ToolWithHandler>): void {
  const tool: ToolWithHandler = {
    name: 'text',
    description: 'Extract text content from a page',
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
      return result;
    },
  };

  tools.set(tool.name, tool);
}
