import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getConfig } from './config.js';
import { getLogger, resetLogger } from './logger.js';
import { PinchtabClient } from './client/pinchtab-client.js';
import { DockerManager } from './client/docker-manager.js';
import { PinchtabError, ToolWithHandler } from './types/index.js';

// Import tool handlers
import { registerHealthTool } from './tools/thin/health.js';
import { registerTabTools } from './tools/thin/tabs.js';
import { registerNavigateTool } from './tools/thin/navigate.js';
import { registerSnapshotTool } from './tools/thin/snapshot.js';
import { registerTextTool } from './tools/thin/text.js';
import { registerActionTool } from './tools/thin/action.js';
import { registerEvaluateTool } from './tools/thin/evaluate.js';
import { registerLockTools } from './tools/thin/lock.js';
import { registerScreenshotTool } from './tools/thin/screenshot.js';
import { registerDownloadTool } from './tools/thin/download.js';

// Import macro tools
import { registerReadPageTool } from './tools/macro/read-page.js';
import { registerListInteractivesTool } from './tools/macro/list-interactives.js';
import { registerObserveChangesTool } from './tools/macro/observe-changes.js';
import { registerReadRegionTool } from './tools/macro/read-region.js';

const logger = getLogger();

export class PinchtabMcpServer {
  private server: Server;
  private transport: StdioServerTransport;
  private pinchtabClient?: PinchtabClient;
  private dockerManager?: DockerManager;
  private tools: Map<string, ToolWithHandler> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'pinchtab-mcp-wrapper',
        version: '0.2.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.transport = new StdioServerTransport();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Register all tools
    this.registerTools();

    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Array.from(this.tools.values()),
      };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      logger.debug(`Tool called: ${name}`, args);

      const tool = this.tools.get(name);
      if (!tool) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: Unknown tool "${name}"`,
            },
          ],
          isError: true,
        };
      }

      try {
        if (!this.pinchtabClient) {
          throw new Error('Pinchtab client not initialized');
        }

        const handler = (tool as any).handler;
        if (!handler) {
          throw new Error(`Tool "${name}" has no handler`);
        }

        const result = await handler(args || {}, this.pinchtabClient);
        
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error(`Tool execution failed: ${name}`, error);
        
        const errorMessage = error instanceof PinchtabError 
          ? `[${error.code}] ${error.message}`
          : error instanceof Error 
            ? error.message 
            : String(error);

        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private registerTools(): void {
    // Thin tools
    registerHealthTool(this.tools);
    registerTabTools(this.tools);
    registerNavigateTool(this.tools);
    registerSnapshotTool(this.tools);
    registerTextTool(this.tools);
    registerActionTool(this.tools);
    registerEvaluateTool(this.tools);
    registerLockTools(this.tools);
    registerScreenshotTool(this.tools);
    registerDownloadTool(this.tools);

    // Macro tools
    registerReadPageTool(this.tools);
    registerListInteractivesTool(this.tools);
    registerObserveChangesTool(this.tools);
    registerReadRegionTool(this.tools);

    logger.info(`Registered ${this.tools.size} tools`);
  }

  async initialize(): Promise<void> {
    const config = getConfig();
    
    logger.info('Initializing Pinchtab MCP Wrapper');
    logger.info(`Mode: ${config.mode}`);

    if (config.mode === 'external') {
      if (!config.url) {
        throw new Error('PINCHTAB_URL required for external mode');
      }
      this.pinchtabClient = new PinchtabClient(config.url, config.token);
      logger.info(`Connected to external Pinchtab at ${config.url}`);
    } else if (config.mode === 'docker' || config.mode === 'auto') {
      this.dockerManager = new DockerManager();
      const { url, token } = await this.dockerManager.start();
      this.pinchtabClient = new PinchtabClient(url, token);
      logger.info(`Started Pinchtab container at ${url}`);
    }

    // Verify connection
    if (this.pinchtabClient) {
      const health = await this.pinchtabClient.health();
      logger.info(`Pinchtab health: ${JSON.stringify(health)}`);
    }
  }

  async start(): Promise<void> {
    logger.info('Starting MCP server');
    await this.server.connect(this.transport);
    logger.info('MCP server connected');
  }

  async stop(): Promise<void> {
    logger.info('Shutting down');
    
    if (this.dockerManager) {
      await this.dockerManager.stop();
    }
    
    await this.server.close();
    logger.info('Server stopped');
  }
}

async function main(): Promise<void> {
  // Debug: Log all environment variables at startup
  logger.info('=== MCP Server Starting ===');
  logger.info(`PINCHTAB_MODE: ${process.env.PINCHTAB_MODE || 'not set'}`);
  logger.info(`PINCHTAB_TOKEN: ${process.env.PINCHTAB_TOKEN ? 'set (length: ' + process.env.PINCHTAB_TOKEN.length + ')' : 'not set'}`);
  logger.info(`PINCHTAB_DOCKER_IMAGE: ${process.env.PINCHTAB_DOCKER_IMAGE || 'not set'}`);
  logger.info(`PINCHTAB_URL: ${process.env.PINCHTAB_URL || 'not set'}`);
  
  const server = new PinchtabMcpServer();

  // Handle graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down`);
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('exit', () => {
    resetLogger();
  });

  try {
    await server.initialize();
    await server.start();
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

main();
