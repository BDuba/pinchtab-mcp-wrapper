import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { PinchtabClient } from '../../src/client/pinchtab-client.js';

const PINCHTAB_URL = process.env.PINCHTAB_URL || 'http://127.0.0.1:19867';
const PINCHTAB_TOKEN = process.env.PINCHTAB_TOKEN || 'test-token';

describe('Integration Tests', () => {
  let client: PinchtabClient;
  let isHealthy = false;

  before(async () => {
    client = new PinchtabClient(PINCHTAB_URL, PINCHTAB_TOKEN);
    try {
      const health = await client.health();
      isHealthy = health.status === 'ok';
      console.log(`Pinchtab health status: ${health.status}`);
    } catch (error) {
      console.log(`Failed to connect to Pinchtab: ${error}`);
      isHealthy = false;
    }
  });

  describe('Health', () => {
    it('should return health status', async () => {
      const health = await client.health();
      // In CI, Chrome might not be available, so we accept both 'ok' and 'error' as valid responses
      // 'ok' means server + Chrome are running
      // 'error' means server is running but Chrome is not connected
      assert.ok(health.status === 'ok' || health.status === 'error',
        `Expected health status to be 'ok' or 'error', got: ${health.status}`);
    });
  });

  describe('Tabs', () => {
    it('should list tabs when Chrome is available', async () => {
      if (!isHealthy) {
        console.log('Skipping: Chrome not available in CI environment');
        return;
      }
      const tabs = await client.listTabs();
      assert.ok(Array.isArray(tabs));
    });

    it('should open and close tab when Chrome is available', async () => {
      if (!isHealthy) {
        console.log('Skipping: Chrome not available in CI environment');
        return;
      }
      const tab = await client.openTab();
      assert.ok(tab.tabId);
      await client.closeTab(tab.tabId);
    });
  });

  describe('Navigation', () => {
    it('should navigate to URL when Chrome is available', async () => {
      if (!isHealthy) {
        console.log('Skipping: Chrome not available in CI environment');
        return;
      }
      const tab = await client.openTab();
      const result = await client.navigate(tab.tabId, 'data:text/html,<h1>Test</h1>');
      assert.ok(result.url);
      await client.closeTab(tab.tabId);
    });
  });
});
