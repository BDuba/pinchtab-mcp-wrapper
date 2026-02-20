import { ToolWithHandler } from '../../types/index.js';
import { PinchtabClient } from '../../client/pinchtab-client.js';
import { getConfig } from '../../config.js';
import { uploadToS3, generateScreenshotFilename } from '../../utils/s3-uploader.js';

export function registerScreenshotTool(tools: Map<string, ToolWithHandler>): void {
  const tool: ToolWithHandler = {
    name: 'screenshot',
    description: 'Take a screenshot of a tab',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          type: 'string',
          description: 'Tab ID (optional, uses active tab if not specified)',
        },
        quality: {
          type: 'number',
          description: 'JPEG quality (1-100)',
        },
        noAnimations: {
          type: 'boolean',
          description: 'Disable animations before screenshot',
        },
        delivery: {
          type: 'string',
          enum: ['base64', 's3', 'file'],
          description: 'Delivery mode',
        },
        path: {
          type: 'string',
          description: 'File path for delivery=file mode',
        },
      },
      required: [],
    },
    handler: async (params: unknown, client: unknown) => {
      const config = getConfig();
      const p = params as {
        tabId?: string;
        quality?: number;
        noAnimations?: boolean;
        delivery?: string;
        path?: string;
      };
      const delivery = p.delivery || config.screenshotDefaultDelivery;
      
      const imageBuffer = await (client as PinchtabClient).screenshot(p.tabId, {
        quality: p.quality,
        noAnimations: p.noAnimations,
      });

      if (delivery === 'base64') {
        return {
          mime: 'image/jpeg',
          bytesBase64: imageBuffer.toString('base64'),
        };
      }

      if (delivery === 's3') {
        const filename = generateScreenshotFilename();
        const result = await uploadToS3(imageBuffer, filename);
        return {
          mime: 'image/jpeg',
          url: result.url,
          bucket: result.bucket,
          key: result.key,
        };
      }

      if (delivery === 'file' && p.path) {
        const fs = await import('fs/promises');
        await fs.writeFile(p.path, imageBuffer);
        return {
          mime: 'image/jpeg',
          path: p.path,
        };
      }

      return {
        mime: 'image/jpeg',
        bytesBase64: imageBuffer.toString('base64'),
      };
    },
  };

  tools.set(tool.name, tool);
}
