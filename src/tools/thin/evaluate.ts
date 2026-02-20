import { ToolWithHandler } from '../../types/index.js';
import { PinchtabClient } from '../../client/pinchtab-client.js';

export function registerEvaluateTool(tools: Map<string, ToolWithHandler>): void {
  const tool: ToolWithHandler = {
    name: 'evaluate',
    description: 'Execute JavaScript in a tab',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          type: 'string',
          description: 'Tab ID',
        },
        js: {
          type: 'string',
          description: 'JavaScript code to execute',
        },
      },
      required: ['tabId', 'js'],
    },
    handler: async (params: unknown, client: unknown) => {
      const p = params as { tabId: string; js: string };
      const result = await (client as PinchtabClient).evaluate(p.tabId, p.js);
      return result;
    },
  };

  tools.set(tool.name, tool);
}
