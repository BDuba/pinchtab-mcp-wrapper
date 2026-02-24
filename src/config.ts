/**
 * Configuration module - loads and validates environment variables
 */

import { PinchtabMode, SnapshotFormat, DeliveryMode } from './types/index.js';
import type { TransportType } from './transports/types.js';
import { getDefaultScreenshotsDir } from './utils/paths.js';

// Default configuration values
const DEFAULTS = {
  MODE: 'auto' as PinchtabMode,
  DOCKER_IMAGE: 'pinchtab/pinchtab:v0.6.3',
  DOCKER_NAME: 'pinchtab',
  STATE_DIR: `${process.env.HOME || process.env.USERPROFILE}/.pinchtab-mcp/state`,
  PORT: 9867,
  PUBLISH: false,
  SNAPSHOT_FORMAT: 'compact' as SnapshotFormat,
  MAX_TOKENS: 2500,
  FILTER_INTERACTIVE: true,
  SCREENSHOT_DELIVERY: 'base64' as DeliveryMode,
  LOG_LEVEL: 'info',
  BINARY_PATH: `${process.env.HOME || process.env.USERPROFILE}/.pinchtab-mcp-wrapper/bin/pinchtab`,
  
  // Transport defaults
  TRANSPORT: 'stdio' as TransportType,
  HTTP_PORT: 3000,
  HTTP_HOST: '0.0.0.0',
  HTTP_PATH: '/mcp',
  AUTH_TYPE: 'none' as 'none' | 'bearer' | 'api-key',
  ENABLE_SESSIONS: true,
  SESSION_TIMEOUT: 3600, // seconds
};

export interface Config {
  // Pinchtab connection
  mode: PinchtabMode;
  url?: string;
  token?: string;
  binaryPath?: string;
  
  // Docker settings
  dockerImage: string;
  dockerName: string;
  stateDir: string;
  port: number;
  publish: boolean;
  
  // Token saver defaults
  defaultSnapshotFormat: SnapshotFormat;
  defaultMaxTokens: number;
  defaultFilterInteractive: boolean;
  
  // Screenshot settings
  screenshotDefaultDelivery: DeliveryMode;
  s3Endpoint?: string;
  s3Region?: string;
  s3Bucket?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  s3Prefix?: string;
  s3PublicUrlBase?: string;
  
  // Screenshot directory settings
  screenshotsDir: string;
  screenshotsAutoCreateDir: boolean;
  screenshotsNamingPattern: string;
  
  // Logging
  logLevel: string;
  
  // Transport configuration (new in v0.5.0)
  transport: TransportType;
  httpPort: number;
  httpHost: string;
  httpPath: string;
  
  // Auth configuration
  authType: 'none' | 'bearer' | 'api-key';
  authToken?: string;
  allowedOrigins: string[];
  
  // Session management
  enableSessions: boolean;
  sessionTimeout: number;
}

function getEnvString(key: string, defaultValue?: string): string | undefined {
  const value = process.env[key];
  return value !== undefined && value !== '' ? value : defaultValue;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined || value === '') return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined || value === '') return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

function getEnvArray(key: string, defaultValue: string[]): string[] {
  const value = process.env[key];
  if (value === undefined || value === '') return defaultValue;
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

function validateMode(mode: string): PinchtabMode {
  const validModes: PinchtabMode[] = ['auto', 'docker', 'external'];
  if (!validModes.includes(mode as PinchtabMode)) {
    throw new Error(`Invalid PINCHTAB_MODE: ${mode}. Must be one of: ${validModes.join(', ')}`);
  }
  return mode as PinchtabMode;
}

function validateTransport(transport: string): TransportType {
  const validTransports: TransportType[] = ['stdio', 'streamable-http', 'sse'];
  if (!validTransports.includes(transport as TransportType)) {
    throw new Error(`Invalid MCP_TRANSPORT: ${transport}. Must be one of: ${validTransports.join(', ')}`);
  }
  return transport as TransportType;
}

function validateSnapshotFormat(format: string): SnapshotFormat {
  const validFormats: SnapshotFormat[] = ['compact', 'text', 'json', 'yaml'];
  if (!validFormats.includes(format as SnapshotFormat)) {
    throw new Error(`Invalid DEFAULT_SNAPSHOT_FORMAT: ${format}. Must be one of: ${validFormats.join(', ')}`);
  }
  return format as SnapshotFormat;
}

function validateDeliveryMode(mode: string): DeliveryMode {
  const validModes: DeliveryMode[] = ['base64', 's3', 'file'];
  if (!validModes.includes(mode as DeliveryMode)) {
    throw new Error(`Invalid SCREENSHOT_DEFAULT_DELIVERY: ${mode}. Must be one of: ${validModes.join(', ')}`);
  }
  return mode as DeliveryMode;
}

function validateAuthType(type: string): 'none' | 'bearer' | 'api-key' {
  const validTypes: Array<'none' | 'bearer' | 'api-key'> = ['none', 'bearer', 'api-key'];
  if (!validTypes.includes(type as 'none' | 'bearer' | 'api-key')) {
    throw new Error(`Invalid MCP_AUTH_TYPE: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }
  return type as 'none' | 'bearer' | 'api-key';
}

export function loadConfig(): Config {
  const mode = validateMode(getEnvString('PINCHTAB_MODE', DEFAULTS.MODE)!);
  const transport = validateTransport(getEnvString('MCP_TRANSPORT', DEFAULTS.TRANSPORT)!);
  const authType = validateAuthType(getEnvString('MCP_AUTH_TYPE', DEFAULTS.AUTH_TYPE)!);
  
  const config: Config = {
    // Pinchtab connection
    mode,
    url: getEnvString('PINCHTAB_URL'),
    token: getEnvString('PINCHTAB_TOKEN'),
    binaryPath: getEnvString('PINCHTAB_BINARY_PATH', DEFAULTS.BINARY_PATH),
    
    // Docker settings
    dockerImage: getEnvString('PINCHTAB_DOCKER_IMAGE', DEFAULTS.DOCKER_IMAGE)!,
    dockerName: getEnvString('PINCHTAB_DOCKER_NAME', DEFAULTS.DOCKER_NAME)!,
    stateDir: getEnvString('PINCHTAB_STATE_DIR', DEFAULTS.STATE_DIR)!,
    port: getEnvNumber('PINCHTAB_PORT', DEFAULTS.PORT),
    publish: getEnvBoolean('PINCHTAB_PUBLISH', DEFAULTS.PUBLISH),
    
    // Token saver defaults
    defaultSnapshotFormat: validateSnapshotFormat(getEnvString('DEFAULT_SNAPSHOT_FORMAT', DEFAULTS.SNAPSHOT_FORMAT)!),
    defaultMaxTokens: getEnvNumber('DEFAULT_MAX_TOKENS', DEFAULTS.MAX_TOKENS),
    defaultFilterInteractive: getEnvBoolean('DEFAULT_FILTER_INTERACTIVE', DEFAULTS.FILTER_INTERACTIVE),
    
    // Screenshot settings
    screenshotDefaultDelivery: validateDeliveryMode(getEnvString('SCREENSHOT_DEFAULT_DELIVERY', DEFAULTS.SCREENSHOT_DELIVERY)!),
    s3Endpoint: getEnvString('S3_ENDPOINT'),
    s3Region: getEnvString('S3_REGION'),
    s3Bucket: getEnvString('S3_BUCKET'),
    s3AccessKeyId: getEnvString('S3_ACCESS_KEY_ID'),
    s3SecretAccessKey: getEnvString('S3_SECRET_ACCESS_KEY'),
    s3Prefix: getEnvString('S3_PREFIX'),
    s3PublicUrlBase: getEnvString('S3_PUBLIC_URL_BASE'),
    
    // Screenshot directory settings
    screenshotsDir: (getEnvString('SCREENSHOTS_DIR') as string | undefined) ?? getDefaultScreenshotsDir(),
    screenshotsAutoCreateDir: getEnvBoolean('SCREENSHOTS_AUTO_CREATE', true),
    screenshotsNamingPattern: getEnvString('SCREENSHOTS_PATTERN', '{timestamp}-{tabId}.jpg') ?? '{timestamp}-{tabId}.jpg',
    
    // Logging
    logLevel: getEnvString('LOG_LEVEL', DEFAULTS.LOG_LEVEL)!,
    
    // Transport configuration (v0.5.0)
    transport,
    httpPort: getEnvNumber('MCP_HTTP_PORT', DEFAULTS.HTTP_PORT),
    httpHost: getEnvString('MCP_HTTP_HOST', DEFAULTS.HTTP_HOST)!,
    httpPath: getEnvString('MCP_HTTP_PATH', DEFAULTS.HTTP_PATH)!,
    
    // Auth configuration
    authType,
    authToken: getEnvString('MCP_AUTH_TOKEN'),
    allowedOrigins: getEnvArray('MCP_ALLOWED_ORIGINS', ['*']),
    
    // Session management
    enableSessions: getEnvBoolean('MCP_ENABLE_SESSIONS', DEFAULTS.ENABLE_SESSIONS),
    sessionTimeout: getEnvNumber('MCP_SESSION_TIMEOUT', DEFAULTS.SESSION_TIMEOUT),
  };

  // Validation for external mode
  if (mode === 'external') {
    if (!config.url) {
      throw new Error('PINCHTAB_URL is required when PINCHTAB_MODE=external');
    }
    if (!config.token) {
      throw new Error('PINCHTAB_TOKEN is required when PINCHTAB_MODE=external');
    }
  }

  // Validation for HTTP transport
  if (transport !== 'stdio') {
    if (config.httpPort < 1 || config.httpPort > 65535) {
      throw new Error(`MCP_HTTP_PORT must be between 1 and 65535`);
    }
    
    // Auth required for HTTP transports in production
    if (authType === 'none' && process.env.NODE_ENV === 'production') {
      console.warn('WARNING: HTTP transport without authentication is insecure. Set MCP_AUTH_TYPE and MCP_AUTH_TOKEN');
    }
  }

  // Validation for S3 mode
  if (config.screenshotDefaultDelivery === 's3') {
    const requiredS3Vars = ['S3_ENDPOINT', 'S3_BUCKET'];
    const missing = requiredS3Vars.filter(v => !getEnvString(v));
    if (missing.length > 0) {
      throw new Error(`S3 delivery requires: ${missing.join(', ')}`);
    }
  }

  return config;
}

// Singleton config instance
let configInstance: Config | null = null;

export function getConfig(): Config {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

export function resetConfig(): void {
  configInstance = null;
}
