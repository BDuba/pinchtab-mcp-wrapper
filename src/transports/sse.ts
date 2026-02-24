/**
 * SSE (Server-Sent Events) transport - legacy, deprecated
 * Use Streamable HTTP instead for new implementations
 */

import http from 'http';
import type { Server as MCPServer } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { Transport, TransportConfig, TransportInfo } from './types.js';
import { getLogger } from '../logger.js';

const logger = getLogger();

export class SSETransport implements Transport {
  private config: TransportConfig;
  private server?: http.Server;
  private sseTransport?: SSEServerTransport;
  private info: TransportInfo;

  constructor(config: TransportConfig) {
    this.config = {
      port: 3000,
      host: '0.0.0.0',
      path: '/sse',
      ...config,
    };
    
    this.info = {
      type: 'sse',
      status: 'connecting',
      endpoint: `http://${this.config.host}:${this.config.port}${this.config.path}`,
      port: this.config.port,
    };
    
    logger.warn('SSE transport is deprecated. Use streamable-http instead.');
  }

  async connect(mcpServer: MCPServer): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        logger.info(`Starting SSE transport on ${this.config.host}:${this.config.port}`);

        this.server = http.createServer(this.handleRequest.bind(this));

        this.server.listen(this.config.port, this.config.host, () => {
          logger.info(`SSE transport listening on ${this.config.host}:${this.config.port}`);
          this.info.status = 'connected';
          resolve();
        });

        this.server.on('error', (error) => {
          logger.error('SSE server error:', error);
          this.info.status = 'error';
          this.info.error = error.message;
          reject(error);
        });

      } catch (error) {
        this.info.status = 'error';
        this.info.error = error instanceof Error ? error.message : String(error);
        reject(error);
      }
    });
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    
    logger.debug(`SSE ${req.method} ${url.pathname}`);

    // Health check
    if (url.pathname === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', transport: 'sse', deprecated: true }));
      return;
    }

    // SSE endpoint
    if (url.pathname === this.config.path) {
      // Create new SSE transport for this connection
      this.sseTransport = new SSEServerTransport('/message', res);
      
      // Note: In real implementation, you'd need to store this transport
      // and connect it to the MCP server. This is a simplified version.
      
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  async close(): Promise<void> {
    logger.info('Closing SSE transport');

    if (this.sseTransport) {
      await this.sseTransport.close();
    }

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
    }

    this.info.status = 'closed';
    logger.info('SSE transport closed');
  }

  getInfo(): TransportInfo {
    return { ...this.info };
  }
}
