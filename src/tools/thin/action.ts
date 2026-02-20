import { ToolWithHandler } from '../../types/index.js';
import { PinchtabClient } from '../../client/pinchtab-client.js';

export function registerActionTool(tools: Map<string, ToolWithHandler>): void {
  const tool: ToolWithHandler = {
    name: 'action',
    description: 'Perform an action on a page element',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          type: 'string',
          description: 'Tab ID',
        },
        kind: {
          type: 'string',
          enum: ['click', 'type', 'fill', 'press', 'focus', 'hover', 'select', 'scroll', 'humanClick', 'humanType'],
          description: 'Action type',
        },
        ref: {
          type: 'string',
          description: 'Element reference (preferred)',
        },
        selector: {
          type: 'string',
          description: 'CSS selector (fallback)',
        },
        text: {
          type: 'string',
          description: 'Text to type',
        },
        value: {
          type: 'string',
          description: 'Value to set',
        },
        key: {
          type: 'string',
          description: 'Key to press',
        },
        x: {
          type: 'number',
          description: 'X coordinate for scroll',
        },
        y: {
          type: 'number',
          description: 'Y coordinate for scroll',
        },
        scrollX: {
          type: 'number',
          description: 'Horizontal scroll amount',
        },
        scrollY: {
          type: 'number',
          description: 'Vertical scroll amount',
        },
      },
      required: ['tabId', 'kind'],
    },
    handler: async (params: unknown, client: unknown) => {
      const p = params as {
        tabId: string;
        kind: string;
        ref?: string;
        selector?: string;
        text?: string;
        value?: string;
        key?: string;
        x?: number;
        y?: number;
        scrollX?: number;
        scrollY?: number;
      };
      const result = await (client as PinchtabClient).action(p.tabId, {
        kind: p.kind,
        ref: p.ref,
        selector: p.selector,
        text: p.text,
        value: p.value,
        key: p.key,
        x: p.x,
        y: p.y,
        scrollX: p.scrollX,
        scrollY: p.scrollY,
      });
      return result;
    },
  };

  tools.set(tool.name, tool);
}
