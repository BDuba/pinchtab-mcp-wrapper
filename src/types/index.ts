/**
 * Core type definitions for pinchtab-mcp-wrapper
 */

// Pinchtab API Response Types
export interface PinchtabHealthResponse {
  status: 'ok' | 'error';
  version?: string;
  uptime?: number;
}

export interface PinchtabTab {
  id: string;
  url: string;
  title?: string;
  active: boolean;
}

export interface PinchtabSnapshotElement {
  ref: string;
  tag: string;
  text?: string;
  attrs?: Record<string, string>;
  interactive?: boolean;
  children?: PinchtabSnapshotElement[];
}

export interface PinchtabSnapshot {
  url: string;
  title?: string;
  elements: PinchtabSnapshotElement[];
  format: 'json' | 'text' | 'compact' | 'yaml';
}

export interface PinchtabTextResponse {
  url: string;
  title?: string;
  content: string;
}

export interface PinchtabActionResult {
  success: boolean;
  message?: string;
}

export interface PinchtabEvaluateResult {
  result: unknown;
  error?: string;
}

export interface PinchtabLockResult {
  locked: boolean;
  owner?: string;
  expiresAt?: string;
}

export interface PinchtabScreenshotResult {
  mime: string;
  bytesBase64?: string;
  width?: number;
  height?: number;
  url?: string;
  bucket?: string;
  key?: string;
  path?: string;
}

// Configuration Types
export type PinchtabMode = 'auto' | 'docker' | 'external';
export type SnapshotFormat = 'compact' | 'text' | 'json' | 'yaml';
export type DeliveryMode = 'base64' | 's3' | 'file';
export type ActionKind = 'click' | 'type' | 'fill' | 'press' | 'focus' | 'hover' | 'select' | 'scroll' | 'humanClick' | 'humanType';
export type TextMode = 'readability' | 'raw';

export interface S3Config {
  endpoint?: string;
  region?: string;
  bucket?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  prefix?: string;
  publicUrlBase?: string;
}

export interface PinchtabConfig {
  mode: PinchtabMode;
  url?: string;
  token?: string;
  dockerImage: string;
  dockerName: string;
  stateDir: string;
  port: number;
  publish: boolean;
}

export interface TokenSaverDefaults {
  snapshotFormat: SnapshotFormat;
  maxTokens: number;
  filterInteractive: boolean;
}

export interface ScreenshotConfig {
  defaultDelivery: DeliveryMode;
  s3?: S3Config;
}

// MCP Tool Parameter Types
export interface HealthParams {
  // No params
}

export interface TabListParams {
  // No params
}

export interface TabOpenParams {
  url?: string;
}

export interface TabCloseParams {
  tabId: string;
}

export interface NavigateParams {
  tabId: string;
  url: string;
}

export interface SnapshotParams {
  tabId?: string;
  filter?: 'interactive' | null;
  format?: SnapshotFormat;
  diff?: boolean;
  selector?: string;
  depth?: number;
  maxTokens?: number;
  noAnimations?: boolean;
  output?: 'inline' | 'file';
  path?: string;
}

export interface TextParams {
  tabId?: string;
  mode?: TextMode;
}

export interface ActionParams {
  tabId: string;
  kind: ActionKind;
  ref?: string;
  selector?: string;
  text?: string;
  value?: string;
  key?: string;
  x?: number;
  y?: number;
  scrollX?: number;
  scrollY?: number;
}

export interface EvaluateParams {
  tabId: string;
  js: string;
}

export interface TabLockParams {
  tabId: string;
  owner: string;
  timeoutMs?: number;
}

export interface TabUnlockParams {
  tabId: string;
  owner: string;
}

export interface ScreenshotParams {
  tabId?: string;
  quality?: number;
  noAnimations?: boolean;
  delivery?: DeliveryMode;
  path?: string;
}

// Macro tool params
export interface ReadPageParams {
  tabId?: string;
  mode?: TextMode;
}

export interface ListInteractivesParams {
  tabId?: string;
  maxTokens?: number;
}

export interface ObserveChangesParams {
  tabId?: string;
  filter?: 'interactive' | null;
  format?: 'compact' | 'text';
  maxTokens?: number;
}

export interface ReadRegionParams {
  tabId: string;
  selector: string;
  format?: 'text' | 'compact';
  maxTokens?: number;
}

// Error Types
export class PinchtabError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'PinchtabError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export type ToolHandler = (params: unknown, client: unknown) => Promise<unknown>;

export interface ToolWithHandler {
  name: string;
  description?: string;
  inputSchema: object;
  handler: (params: unknown, client: unknown) => Promise<unknown>;
}

export interface ToolWithHandler {
  name: string;
  description?: string;
  inputSchema: object;
  handler: ToolHandler;
}
