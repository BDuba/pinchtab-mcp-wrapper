import { ToolWithHandler } from '../../types/index.js';
import { PinchtabClient } from '../../client/pinchtab-client.js';

export function registerObserveChangesTool(tools: Map<string, ToolWithHandler>): void {
  const tool: ToolWithHandler = {
    name: 'observe_changes',
    description: 'Get only changed elements since last snapshot (diff mode)',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          type: 'string',
          description: 'Tab ID (optional, uses active tab if not specified)',
        },
        filter: {
          type: 'string',
          enum: ['interactive'],
          description: 'Filter to interactive elements',
        },
        format: {
          type: 'string',
          enum: ['compact', 'text'],
          description: 'Output format',
        },
        maxTokens: {
          type: 'number',
          description: 'Maximum tokens in response',
        },
      },
      required: [],
    },
    handler: async (params: unknown, client: unknown) => {
      const p = params as {
        tabId?: string;
        filter?: 'interactive';
        format?: 'compact' | 'text';
        maxTokens?: number;
      };
      const result = await (client as PinchtabClient).snapshot(p.tabId, {
        filter: p.filter,
        format: p.format || 'compact',
        diff: true,
        maxTokens: p.maxTokens,
      });
      return result;
    },
  };

  tools.set(tool.name, tool);
}
