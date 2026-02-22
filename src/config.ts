/**
 * Configuration module - loads and validates environment variables
 */

import { PinchtabMode, SnapshotFormat, DeliveryMode } from './types/index.js';
import { getDefaultScreenshotsDir } from './utils/paths.js';

// Default configuration values
const DEFAULTS = {
  MODE: 'auto' as PinchtabMode,
  DOCKER_IMAGE: 'pinchtab/pinchtab:v0.5.1',
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

function validateMode(mode: string): PinchtabMode {
  const validModes: PinchtabMode[] = ['auto', 'docker', 'external'];
  if (!validModes.includes(mode as PinchtabMode)) {
    throw new Error(`Invalid PINCHTAB_MODE: ${mode}. Must be one of: ${validModes.join(', ')}`);
  }
  return mode as PinchtabMode;
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

export function loadConfig(): Config {
  const mode = validateMode(getEnvString('PINCHTAB_MODE', DEFAULTS.MODE)!);
  
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
