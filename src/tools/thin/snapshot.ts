import { ToolWithHandler } from '../../types/index.js';
import { PinchtabClient } from '../../client/pinchtab-client.js';

export function registerSnapshotTool(tools: Map<string, ToolWithHandler>): void {
  const tool: ToolWithHandler = {
    name: 'snapshot',
    description: 'Get accessibility snapshot of a page',
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
          description: 'Filter to interactive elements only',
        },
        format: {
          type: 'string',
          enum: ['json', 'text', 'compact', 'yaml'],
          description: 'Output format',
        },
        diff: {
          type: 'boolean',
          description: 'Return only changed elements',
        },
        selector: {
          type: 'string',
          description: 'CSS selector to limit scope',
        },
        depth: {
          type: 'number',
          description: 'Maximum DOM depth',
        },
        maxTokens: {
          type: 'number',
          description: 'Maximum tokens in response',
        },
        noAnimations: {
          type: 'boolean',
          description: 'Disable animations before snapshot',
        },
        output: {
          type: 'string',
          enum: ['inline', 'file'],
          description: 'Output mode',
        },
        path: {
          type: 'string',
          description: 'File path for output=file mode',
        },
      },
      required: [],
    },
    handler: async (params: unknown, client: unknown) => {
      const p = params as {
        tabId?: string;
        filter?: 'interactive';
        format?: string;
        diff?: boolean;
        selector?: string;
        depth?: number;
        maxTokens?: number;
        noAnimations?: boolean;
        output?: string;
        path?: string;
      };
      const result = await (client as PinchtabClient).snapshot(p.tabId, {
        filter: p.filter,
        format: p.format,
        diff: p.diff,
        selector: p.selector,
        depth: p.depth,
        maxTokens: p.maxTokens,
        noAnimations: p.noAnimations,
        output: p.output,
        path: p.path,
      });
      return result;
    },
  };

  tools.set(tool.name, tool);
}
