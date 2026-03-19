import http from 'http';
import type { Server as MCPServer } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Transport, TransportConfig, TransportInfo, Session } from './types.js';
import { getLogger } from '../logger.js';
import { generateId } from './utils.js';

const logger = getLogger();

export class StreamableHTTPTransport implements Transport {
  private config: TransportConfig;
  private server?: http.Server;
  private mcpTransport?: StreamableHTTPServerTransport;
  private sessions: Map<string, Session> = new Map();
  private info: TransportInfo;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: TransportConfig) {
    this.config = {
      port: 3000,
      host: '0.0.0.0',
      path: '/mcp',
      enableSessions: false,
      sessionTimeout: 3600,
      ...config,
    };
    
    this.info = {
      type: 'streamable-http',
      status: 'connecting',
      endpoint: `http://${this.config.host}:${this.config.port}${this.config.path}`,
      port: this.config.port,
    };
  }

  async connect(mcpServer: MCPServer): Promise<void> {
    try {
      logger.info(`Starting Streamable HTTP transport on ${this.config.host}:${this.config.port}`);

      // Create the MCP Streamable HTTP transport once
      this.mcpTransport = this.createTransport();
      
      // Connect MCP Server to the transport
      await mcpServer.connect(this.mcpTransport);
      logger.info('MCP Server connected to Streamable HTTP transport');

      // Create HTTP server to handle requests
      this.server = http.createServer(this.handleRequest.bind(this));

      if (this.config.enableSessions) {
        this.cleanupInterval = setInterval(
          () => this.cleanupSessions(),
          60000
        );
      }

      await new Promise<void>((resolve, reject) => {
        this.server!.listen(this.config.port, this.config.host, () => {
          logger.info(`Streamable HTTP transport listening on ${this.config.host}:${this.config.port}`);
          logger.info(`MCP endpoint: ${this.config.path}`);
          logger.info(`Sessions: ${this.config.enableSessions ? 'enabled' : 'disabled'}`);
          
          this.info.status = 'connected';
          resolve();
        });

        this.server!.on('error', (error) => {
          logger.error('HTTP server error:', error);
          this.info.status = 'error';
          this.info.error = error.message;
          reject(error);
        });
      });

    } catch (error) {
      this.info.status = 'error';
      this.info.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    
    logger.debug(`${req.method} ${url.pathname}`);

    if (url.pathname === '/health' && req.method === 'GET') {
      this.handleHealth(req, res);
      return;
    }

    if (url.pathname === '/status' && req.method === 'GET') {
      this.handleHealth(req, res);
      return;
    }

    if (url.pathname === this.config.path) {
      await this.handleMCPRequest(req, res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  private handleHealth(_req: http.IncomingMessage, res: http.ServerResponse): void {
    const health = {
      status: 'ok',
      transport: 'streamable-http',
      version: '0.6.1',
      sessions: this.sessions.size,
      timestamp: new Date().toISOString(),
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(health));
  }

  private async handleMCPRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      if (!this.isAuthorized(req)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      if (!this.handleCors(req, res)) {
        return;
      }

      if (!this.mcpTransport) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Server not ready' }));
        return;
      }

      let parsedBody: unknown = undefined;
      if (req.method === 'POST') {
        parsedBody = await this.parseBody(req);
      }

      // Delegate to the MCP transport - no need to create new transport or reconnect
      await this.mcpTransport.handleRequest(req, res, parsedBody);

    } catch (error) {
      logger.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Internal server error', 
          details: error instanceof Error ? error.message : String(error) 
        }));
      }
    }
  }

  private createTransport(): StreamableHTTPServerTransport {
    if (this.config.enableSessions) {
      return new StreamableHTTPServerTransport({
        sessionIdGenerator: (): string => generateId(),
        onsessioninitialized: (sessionId: string): void => {
          logger.debug(`Session initialized: ${sessionId}`);
          this.sessions.set(sessionId, {
            id: sessionId,
            createdAt: new Date(),
            lastActivity: new Date(),
            expiresAt: new Date(Date.now() + (this.config.sessionTimeout || 3600) * 1000),
          });
        },
      });
    }

    return new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
  }

  private async parseBody(req: http.IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          if (body) {
            resolve(JSON.parse(body));
          } else {
            resolve(undefined);
          }
        } catch (e) {
          reject(e);
        }
      });
      req.on('error', reject);
    });
  }

  private isAuthorized(req: http.IncomingMessage): boolean {
    if (this.config.authType === 'none' || !this.config.authToken) {
      return true;
    }

    const authHeader = req.headers.authorization || '';

    switch (this.config.authType) {
      case 'bearer': {
        const match = authHeader.match(/^Bearer\s+(.+)$/i);
        if (match && match[1] === this.config.authToken) {
          return true;
        }
        logger.warn('Bearer token mismatch');
        return false;
      }
      
      case 'api-key': {
        if (authHeader === this.config.authToken) {
          return true;
        }
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        if (url.searchParams.get('api_key') === this.config.authToken) {
          return true;
        }
        logger.warn('API key mismatch');
        return false;
      }
      
      default:
        return true;
    }
  }

  private handleCors(req: http.IncomingMessage, res: http.ServerResponse): boolean {
    const origin = req.headers.origin || '';
    const cors = this.config.cors;

    if (!cors) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id');
      res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
    } else {
      const allowed = cors.origins.includes('*') || cors.origins.includes(origin);
      
      if (!allowed && origin) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Origin not allowed' }));
        return false;
      }

      if (allowed) {
        res.setHeader('Access-Control-Allow-Origin', cors.origins.includes('*') ? '*' : origin);
        res.setHeader('Access-Control-Allow-Methods', cors.methods?.join(', ') || 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', cors.headers?.join(', ') || 'Content-Type, Authorization, Mcp-Session-Id');
        res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
        
        if (cors.credentials) {
          res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
      }
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return false;
    }

    return true;
  }

  private cleanupSessions(): void {
    const now = new Date();
    let removed = 0;
    
    for (const [id, session] of this.sessions) {
      if (session.expiresAt && session.expiresAt < now) {
        this.sessions.delete(id);
        removed++;
      }
    }
    
    if (removed > 0) {
      logger.debug(`Cleaned up ${removed} expired sessions`);
    }
  }

  async close(): Promise<void> {
    logger.info('Closing Streamable HTTP transport');

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.sessions.clear();

    if (this.mcpTransport) {
      await this.mcpTransport.close();
    }

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => {
          logger.info('HTTP server closed');
          resolve();
        });
      });
    }

    this.info.status = 'closed';
    logger.info('Streamable HTTP transport closed');
  }

  getInfo(): TransportInfo {
    return { ...this.info };
  }
}
