import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { loadConfig, getConfig, resetConfig } from './config.js';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetConfig();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetConfig();
  });

  it('should load default configuration', () => {
    delete process.env.PINCHTAB_MODE;
    
    const config = loadConfig();
    
    assert.strictEqual(config.mode, 'auto');
    assert.strictEqual(config.dockerImage, 'pinchtab/pinchtab:v0.5.1');
    assert.strictEqual(config.port, 9867);
    assert.strictEqual(config.defaultSnapshotFormat, 'compact');
    assert.strictEqual(config.defaultMaxTokens, 2500);
  });

  it('should load external mode configuration', () => {
    process.env.PINCHTAB_MODE = 'external';
    process.env.PINCHTAB_URL = 'http://localhost:9867';
    process.env.PINCHTAB_TOKEN = 'test-token';
    
    const config = loadConfig();
    
    assert.strictEqual(config.mode, 'external');
    assert.strictEqual(config.url, 'http://localhost:9867');
    assert.strictEqual(config.token, 'test-token');
  });

  it('should throw error for external mode without URL', () => {
    process.env.PINCHTAB_MODE = 'external';
    delete process.env.PINCHTAB_URL;
    
    assert.throws(() => loadConfig(), /PINCHTAB_URL is required/);
  });

  it('should throw error for external mode without token', () => {
    process.env.PINCHTAB_MODE = 'external';
    process.env.PINCHTAB_URL = 'http://localhost:9867';
    delete process.env.PINCHTAB_TOKEN;
    
    assert.throws(() => loadConfig(), /PINCHTAB_TOKEN is required/);
  });

  it('should validate snapshot format', () => {
    process.env.DEFAULT_SNAPSHOT_FORMAT = 'invalid';
    
    assert.throws(() => loadConfig(), /Invalid DEFAULT_SNAPSHOT_FORMAT/);
  });

  it('should get singleton config instance', () => {
    const config1 = getConfig();
    const config2 = getConfig();
    
    assert.strictEqual(config1, config2);
  });

  it('should load binary path from environment', () => {
    process.env.PINCHTAB_BINARY_PATH = '/custom/path/pinchtab';
    
    const config = loadConfig();
    
    assert.strictEqual(config.binaryPath, '/custom/path/pinchtab');
  });

  it('should use default binary path when not set', () => {
    delete process.env.PINCHTAB_BINARY_PATH;
    
    const config = loadConfig();
    
    assert(config.binaryPath);
    assert(config.binaryPath.includes('.pinchtab-mcp-wrapper/bin/pinchtab'));
  });
});
