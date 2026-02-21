import { ToolWithHandler } from '../../types/index.js';
import { PinchtabClient } from '../../client/pinchtab-client.js';

export function registerDownloadTool(tools: Map<string, ToolWithHandler>): void {
  const tool: ToolWithHandler = {
    name: 'download',
    description: 'Download files using browser session (preserves cookies, auth, stealth)',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to download (required)',
        },
        tabId: {
          type: 'string',
          description: 'Tab ID (optional, uses active tab if not specified)',
        },
        output: {
          type: 'string',
          enum: ['file', 'base64', 'raw'],
          description: 'Output format: file (save to disk), base64 (JSON), raw (binary)',
        },
        path: {
          type: 'string',
          description: 'File path for output=file mode',
        },
        raw: {
          type: 'boolean',
          description: 'Return raw bytes instead of JSON (same as output=raw)',
        },
      },
      required: ['url'],
    },
    handler: async (params: unknown, client: unknown) => {
      const p = params as {
        url: string;
        tabId?: string;
        output?: 'file' | 'base64' | 'raw';
        path?: string;
        raw?: boolean;
      };
      const result = await (client as PinchtabClient).download(p.url, {
        tabId: p.tabId,
        output: p.output,
        path: p.path,
        raw: p.raw,
      });
      return result;
    },
  };

  tools.set(tool.name, tool);
}