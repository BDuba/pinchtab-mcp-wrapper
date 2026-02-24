import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getConfig } from './config.js';
import { getLogger, resetLogger } from './logger.js';
import { PinchtabClient } from './client/pinchtab-client.js';
import { DockerManager } from './client/docker-manager.js';
import { PinchtabProcessManager } from './client/pinchtab-process-manager.js';
import { PinchtabError, ToolWithHandler } from './types/index.js';
import type { Transport, TransportConfig } from './transports/types.js';
import { TransportFactory } from './transports/factory.js';

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
import { registerUploadTool } from './tools/thin/upload-file.js';

// Import macro tools
import { registerReadPageTool } from './tools/macro/read-page.js';
import { registerListInteractivesTool } from './tools/macro/list-interactives.js';
import { registerObserveChangesTool } from './tools/macro/observe-changes.js';
import { registerReadRegionTool } from './tools/macro/read-region.js';

const logger = getLogger();

export class PinchtabMcpServer {
  private server: Server;
  private transport?: Transport;
  private pinchtabClient?: PinchtabClient;
  private dockerManager?: DockerManager;
  private processManager?: PinchtabProcessManager;
  private tools: Map<string, ToolWithHandler> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'pinchtab-mcp-wrapper',
        version: '0.5.1',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

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

        const toolWithHandler = tool as ToolWithHandler;
        const handler = toolWithHandler.handler;
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
    registerUploadTool(this.tools);

    // Macro tools
    registerReadPageTool(this.tools);
    registerListInteractivesTool(this.tools);
    registerObserveChangesTool(this.tools);
    registerReadRegionTool(this.tools);

    logger.info(`Registered ${this.tools.size} tools`);
  }

  private isLocalUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const localHosts = ['127.0.0.1', 'localhost', '::1'];
      return localHosts.includes(urlObj.hostname) && urlObj.port === String(getConfig().port);
    } catch {
      return false;
    }
  }

  private shouldManageBinaryLocally(url: string): boolean {
    return this.isLocalUrl(url);
  }

  private async createTransport(): Promise<Transport> {
    const config = getConfig();
    
    const transportConfig: TransportConfig = {
      type: config.transport,
      port: config.httpPort,
      host: config.httpHost,
      path: config.httpPath,
      authType: config.authType,
      authToken: config.authToken,
      enableSessions: config.enableSessions,
      sessionTimeout: config.sessionTimeout,
      cors: {
        origins: config.allowedOrigins,
      },
    };

    if (config.transport === 'stdio') {
      // Stdio can be created synchronously
      return TransportFactory.createSync(transportConfig);
    }
    
    // HTTP transports require async creation
    return TransportFactory.create(transportConfig);
  }

  async initialize(): Promise<void> {
    const config = getConfig();
    
    logger.info('Initializing Pinchtab MCP Wrapper v0.5.1');
    logger.info(`Mode: ${config.mode}`);
    logger.info(`Transport: ${config.transport}`);

    if (config.transport !== 'stdio') {
      logger.info(`HTTP endpoint: http://${config.httpHost}:${config.httpPort}${config.httpPath}`);
      logger.info(`Auth: ${config.authType}`);
    }

    if (config.mode === 'external') {
      if (!config.url) {
        throw new Error('PINCHTAB_URL required for external mode');
      }
      
      if (this.shouldManageBinaryLocally(config.url)) {
        try {
          this.processManager = new PinchtabProcessManager();
          const { url, token } = await this.processManager.start();
          this.pinchtabClient = new PinchtabClient(url, token, undefined, async () => {
            if (this.processManager) {
              await this.processManager.restart();
            }
          });
          logger.info(`Started Pinchtab binary at ${url}`);
        } catch (error) {
          logger.warn(`Failed to start Pinchtab binary, connecting to existing server: ${error}`);
          this.pinchtabClient = new PinchtabClient(config.url, config.token);
          logger.info(`Connected to external Pinchtab at ${config.url}`);
        }
      } else {
        this.pinchtabClient = new PinchtabClient(config.url, config.token);
        logger.info(`Connected to external Pinchtab at ${config.url}`);
      }
    } else if (config.mode === 'docker' || config.mode === 'auto') {
      this.dockerManager = new DockerManager();
      const { url, token } = await this.dockerManager.start();
      this.pinchtabClient = new PinchtabClient(url, token, undefined, async () => {
        if (this.dockerManager) {
          await this.dockerManager.restart();
        }
      });
      logger.info(`Started Pinchtab container at ${url}`);
    }

    // Verify connection
    if (this.pinchtabClient) {
      const health = await this.pinchtabClient.health();
      logger.info(`Pinchtab health: ${JSON.stringify(health)}`);
    }

    // Create and initialize transport
    this.transport = await this.createTransport();
    logger.info(`Transport created: ${this.transport.getInfo().type}`);
  }

  async start(): Promise<void> {
    if (!this.transport) {
      throw new Error('Transport not initialized. Call initialize() first.');
    }

    logger.info('Starting MCP server');
    await this.transport.connect(this.server);
    logger.info('MCP server connected and ready');
    
    // Log transport info
    const info = this.transport.getInfo();
    if (info.endpoint) {
      logger.info(`Server endpoint: ${info.endpoint}`);
    }
  }

  async stop(): Promise<void> {
    logger.info('Shutting down');
    
    if (this.dockerManager) {
      await this.dockerManager.stop();
    }
    
    if (this.processManager) {
      await this.processManager.stop();
    }

    if (this.transport) {
      await this.transport.close();
    }
    
    await this.server.close();
    logger.info('Server stopped');
  }
}

async function main(): Promise<void> {
  const config = getConfig();
  
  // Debug: Log all environment variables at startup
  logger.info('=== MCP Server Starting ===');
  logger.info(`Version: 0.5.1`);
  logger.info(`PINCHTAB_MODE: ${process.env.PINCHTAB_MODE || 'not set'}`);
  logger.info(`PINCHTAB_TOKEN: ${process.env.PINCHTAB_TOKEN ? 'set (length: ' + process.env.PINCHTAB_TOKEN.length + ')' : 'not set'}`);
  logger.info(`PINCHTAB_DOCKER_IMAGE: ${process.env.PINCHTAB_DOCKER_IMAGE || 'not set'}`);
  logger.info(`PINCHTAB_URL: ${process.env.PINCHTAB_URL || 'not set'}`);
  logger.info(`MCP_TRANSPORT: ${config.transport}`);
  
  if (config.transport !== 'stdio') {
    logger.info(`MCP_HTTP_PORT: ${config.httpPort}`);
    logger.info(`MCP_HTTP_HOST: ${config.httpHost}`);
    logger.info(`MCP_AUTH_TYPE: ${config.authType}`);
  }
  
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
