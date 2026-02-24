/**
 * Transport layer type definitions
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

export type TransportType = 'stdio' | 'streamable-http' | 'sse';

export interface CorsConfig {
  origins: string[];
  credentials?: boolean;
  methods?: string[];
  headers?: string[];
}

export interface TransportConfig {
  type: TransportType;
  port?: number;
  host?: string;
  path?: string;
  cors?: CorsConfig;
  
  // Auth
  authType?: 'none' | 'bearer' | 'api-key';
  authToken?: string;
  
  // Session
  enableSessions?: boolean;
  sessionTimeout?: number;
}

export interface Transport {
  /** Connect the transport to an MCP server */
  connect(server: Server): Promise<void>;
  
  /** Close the transport gracefully */
  close(): Promise<void>;
  
  /** Get transport info for logging */
  getInfo(): TransportInfo;
}

export interface TransportInfo {
  type: TransportType;
  status: 'connecting' | 'connected' | 'error' | 'closed';
  endpoint?: string;
  port?: number;
  error?: string;
}

export interface Session {
  id: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt?: Date;
}

export interface SessionStore {
  create(): Session;
  get(id: string): Session | undefined;
  update(id: string, data: Partial<Session>): void;
  delete(id: string): void;
  cleanup(): number; // Returns number of expired sessions removed
  getAll(): Session[];
}
