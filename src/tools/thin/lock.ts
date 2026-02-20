import { ToolWithHandler } from '../../types/index.js';
import { PinchtabClient } from '../../client/pinchtab-client.js';

export function registerLockTools(tools: Map<string, ToolWithHandler>): void {
  tools.set('tab_lock', {
    name: 'tab_lock',
    description: 'Lock a tab for exclusive access',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          type: 'string',
          description: 'Tab ID to lock',
        },
        owner: {
          type: 'string',
          description: 'Owner identifier',
        },
        timeoutMs: {
          type: 'number',
          description: 'Lock timeout in milliseconds',
        },
      },
      required: ['tabId', 'owner'],
    },
    handler: async (params: unknown, client: unknown) => {
      const p = params as { tabId: string; owner: string; timeoutMs?: number };
      const result = await (client as PinchtabClient).lockTab(p.tabId, p.owner, p.timeoutMs);
      return result;
    },
  });

  tools.set('tab_unlock', {
    name: 'tab_unlock',
    description: 'Unlock a tab',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          type: 'string',
          description: 'Tab ID to unlock',
        },
        owner: {
          type: 'string',
          description: 'Owner identifier',
        },
      },
      required: ['tabId', 'owner'],
    },
    handler: async (params: unknown, client: unknown) => {
      const p = params as { tabId: string; owner: string };
      await (client as PinchtabClient).unlockTab(p.tabId, p.owner);
      return { success: true };
    },
  });
}
