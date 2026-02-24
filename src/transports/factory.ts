/**
 * Transport factory - creates transport instances based on configuration
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Transport, TransportConfig, TransportInfo } from './types.js';
import { getLogger } from '../logger.js';

const logger = getLogger();

/**
 * Stdio transport wrapper
 */
export class StdioTransport implements Transport {
  private transport: StdioServerTransport;
  private info: TransportInfo;

  constructor() {
    this.transport = new StdioServerTransport();
    this.info = {
      type: 'stdio',
      status: 'connecting',
    };
  }

  async connect(server: Server): Promise<void> {
    try {
      logger.info('Connecting stdio transport');
      await server.connect(this.transport);
      this.info.status = 'connected';
      logger.info('Stdio transport connected');
    } catch (error) {
      this.info.status = 'error';
      this.info.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  async close(): Promise<void> {
    // Stdio transport doesn't need explicit cleanup
    this.info.status = 'closed';
    logger.info('Stdio transport closed');
  }

  getInfo(): TransportInfo {
    return { ...this.info };
  }
}

/**
 * Transport factory
 */
export class TransportFactory {
  static async create(config: TransportConfig): Promise<Transport> {
    logger.info(`Creating transport: ${config.type}`);

    switch (config.type) {
      case 'stdio':
        return new StdioTransport();
      
      case 'streamable-http':
        // Dynamic import to avoid loading HTTP modules when not needed
        return new (await import('./streamable-http.js')).StreamableHTTPTransport(config);
      
      case 'sse':
        // SSE transport (legacy, deprecated)
        return new (await import('./sse.js')).SSETransport(config);
      
      default:
        throw new Error(`Unknown transport type: ${(config as {type: string}).type}`);
    }
  }

  static createSync(config: TransportConfig): Transport {
    logger.info(`Creating transport (sync): ${config.type}`);

    switch (config.type) {
      case 'stdio':
        return new StdioTransport();
      
      default:
        throw new Error(`Transport type '${config.type}' requires async creation. Use create() method.`);
    }
  }
}
