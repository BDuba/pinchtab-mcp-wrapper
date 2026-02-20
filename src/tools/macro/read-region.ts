import { ToolWithHandler } from '../../types/index.js';
import { PinchtabClient } from '../../client/pinchtab-client.js';

export function registerReadRegionTool(tools: Map<string, ToolWithHandler>): void {
  const tool: ToolWithHandler = {
    name: 'read_region',
    description: 'Read a specific region of the page by CSS selector',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          type: 'string',
          description: 'Tab ID (required)',
        },
        selector: {
          type: 'string',
          description: 'CSS selector for the region',
        },
        format: {
          type: 'string',
          enum: ['text', 'compact'],
          description: 'Output format',
        },
        maxTokens: {
          type: 'number',
          description: 'Maximum tokens in response',
        },
      },
      required: ['tabId', 'selector'],
    },
    handler: async (params: unknown, client: unknown) => {
      const p = params as {
        tabId: string;
        selector: string;
        format?: 'text' | 'compact';
        maxTokens?: number;
      };
      const result = await (client as PinchtabClient).snapshot(p.tabId, {
        selector: p.selector,
        format: p.format || 'compact',
        maxTokens: p.maxTokens,
      });
      return result;
    },
  };

  tools.set(tool.name, tool);
}
