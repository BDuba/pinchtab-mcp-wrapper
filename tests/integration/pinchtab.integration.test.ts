import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { PinchtabClient } from '../../src/client/pinchtab-client.js';

const PINCHTAB_URL = process.env.PINCHTAB_URL || 'http://127.0.0.1:19867';
const PINCHTAB_TOKEN = process.env.PINCHTAB_TOKEN || 'test-token';

describe('Integration Tests', () => {
  let client: PinchtabClient;

  before(() => {
    client = new PinchtabClient(PINCHTAB_URL, PINCHTAB_TOKEN);
  });

  describe('Health', () => {
    it('should return health status', async () => {
      const health = await client.health();
      assert.strictEqual(health.status, 'ok');
    });
  });

  describe('Tabs', () => {
    it('should list tabs', async () => {
      const tabs = await client.listTabs();
      assert.ok(Array.isArray(tabs));
    });

    it('should open and close tab', async () => {
      const tab = await client.openTab();
      assert.ok(tab.id);
      await client.closeTab(tab.id);
    });
  });

  describe('Navigation', () => {
    it('should navigate to URL', async () => {
      const tab = await client.openTab();
      const result = await client.navigate(tab.id, 'data:text/html,<h1>Test</h1>');
      assert.ok(result.url);
      await client.closeTab(tab.id);
    });
  });
});
