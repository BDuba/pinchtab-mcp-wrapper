import { ToolWithHandler } from '../../types/index.js';
import { PinchtabClient } from '../../client/pinchtab-client.js';

export function registerHealthTool(tools: Map<string, ToolWithHandler>): void {
  const tool: ToolWithHandler = {
    name: 'pinchtab_health',
    description: 'Check Pinchtab server health status',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async (_params: unknown, client: unknown) => {
      const result = await (client as PinchtabClient).health();
      return result;
    },
  };

  tools.set(tool.name, tool);
}
