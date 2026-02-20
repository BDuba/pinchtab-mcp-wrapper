import { ToolWithHandler } from '../../types/index.js';
import { PinchtabClient } from '../../client/pinchtab-client.js';

export function registerListInteractivesTool(tools: Map<string, ToolWithHandler>): void {
  const tool: ToolWithHandler = {
    name: 'list_interactives',
    description: 'List interactive elements (buttons, links, inputs) in compact format',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          type: 'string',
          description: 'Tab ID (optional, uses active tab if not specified)',
        },
        maxTokens: {
          type: 'number',
          description: 'Maximum tokens in response',
        },
      },
      required: [],
    },
    handler: async (params: unknown, client: unknown) => {
      const p = params as { tabId?: string; maxTokens?: number };
      const result = await (client as PinchtabClient).snapshot(p.tabId, {
        filter: 'interactive',
        format: 'compact',
        maxTokens: p.maxTokens,
      });
      return result;
    },
  };

  tools.set(tool.name, tool);
}
