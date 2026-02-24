import { ToolWithHandler, UploadParams } from '../../types/index.js';
import { PinchtabClient } from '../../client/pinchtab-client.js';

export function registerUploadTool(tools: Map<string, ToolWithHandler>): void {
  const tool: ToolWithHandler = {
    name: 'pinchtab_upload',
    description: 'Upload files to file input elements on a webpage. Supports local file paths, base64 encoded data, or data URLs. Can upload single or multiple files to file input elements.',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          type: 'string',
          description: 'ID of the tab containing the file input',
        },
        files: {
          type: 'array',
          description: 'Array of files to upload',
          items: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Local file path (absolute or relative)',
              },
              base64: {
                type: 'string',
                description: 'Base64 encoded file content',
              },
              dataUrl: {
                type: 'string',
                description: 'Data URL (data:mime/type;base64,...)',
              },
              name: {
                type: 'string',
                description: 'File name (required when using base64 or dataUrl)',
              },
            },
          },
        },
        selector: {
          type: 'string',
          description: 'CSS selector for the file input element (optional if ref is provided)',
        },
        ref: {
          type: 'string',
          description: 'Element reference (e.g., "e5") from snapshot (optional if selector is provided)',
        },
      },
      required: ['tabId', 'files'],
    },
    handler: async (params: unknown, client: unknown) => {
      const uploadParams = params as UploadParams;
      const pinchtabClient = client as PinchtabClient;
      
      const result = await pinchtabClient.upload(
        uploadParams.tabId,
        uploadParams.files,
        {
          selector: uploadParams.selector,
          ref: uploadParams.ref,
        }
      );
      
      return result;
    },
  };

  tools.set(tool.name, tool);
}
