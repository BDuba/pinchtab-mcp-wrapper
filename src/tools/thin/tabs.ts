import { ToolWithHandler } from '../../types/index.js';
import { PinchtabClient } from '../../client/pinchtab-client.js';

export function registerTabTools(tools: Map<string, ToolWithHandler>): void {
  tools.set('tab_list', {
    name: 'tab_list',
    description: 'List all browser tabs',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async (_params: unknown, client: unknown) => {
      const result = await (client as PinchtabClient).listTabs();
      return result;
    },
  });

  tools.set('tab_open', {
    name: 'tab_open',
    description: 'Open a new browser tab',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Optional URL to navigate to',
        },
      },
      required: [],
    },
    handler: async (params: unknown, client: unknown) => {
      const p = params as { url?: string };
      const result = await (client as PinchtabClient).openTab(p.url);
      return result;
    },
  });

  tools.set('tab_close', {
    name: 'tab_close',
    description: 'Close a browser tab',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          type: 'string',
          description: 'Tab ID to close',
        },
      },
      required: ['tabId'],
    },
    handler: async (params: unknown, client: unknown) => {
      const p = params as { tabId: string };
      await (client as PinchtabClient).closeTab(p.tabId);
      return { success: true };
    },
  });
}
