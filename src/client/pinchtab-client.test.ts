import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { PinchtabClient } from './pinchtab-client.js';
import { PinchtabError } from '../types/index.js';

describe('PinchtabClient', () => {
  const baseUrl = 'http://localhost:9867';
  const token = 'test-token';

  describe('constructor', () => {
    it('should create client with base URL and token', () => {
      const client = new PinchtabClient(baseUrl, token);
      assert.strictEqual(client['baseUrl'], baseUrl);
      assert.strictEqual(client['token'], token);
    });

    it('should create client without token', () => {
      const client = new PinchtabClient(baseUrl);
      assert.strictEqual(client['baseUrl'], baseUrl);
      assert.strictEqual(client['token'], undefined);
    });

    it('should accept custom timeout', () => {
      const client = new PinchtabClient(baseUrl, token, 60000);
      assert.strictEqual(client['defaultTimeout'], 60000);
    });

    it('should accept onUnhealthy callback', () => {
      const onUnhealthy = async (): Promise<void> => {};
      const client = new PinchtabClient(baseUrl, token, 30000, onUnhealthy);
      assert.strictEqual(client['onUnhealthy'], onUnhealthy);
    });
  });

  describe('ensureHealthy', () => {
    let client: PinchtabClient;
    let mockFetch: ReturnType<typeof mock.fn>;

    beforeEach(() => {
      mockFetch = mock.fn();
      global.fetch = mockFetch as unknown as typeof global.fetch;
      client = new PinchtabClient(baseUrl, token);
    });

    afterEach(() => {
      mock.restoreAll();
    });

    it('should not throw when health is ok', async () => {
      mockFetch.mock.mockImplementation(async (url: string) => {
        if (url === `${baseUrl}/health`) {
          return {
            ok: true,
            json: async () => ({ status: 'ok' }),
          } as Response;
        }
        throw new Error('Unexpected URL');
      });

      await assert.doesNotReject(client.ensureHealthy());
    });

    it('should call onUnhealthy callback when health is not ok', async () => {
      let unhealthyCalled = false;
      const onUnhealthy = async (): Promise<void> => {
        unhealthyCalled = true;
      };
      
      const unhealthyClient = new PinchtabClient(baseUrl, token, 30000, onUnhealthy);
      
      mockFetch.mock.mockImplementation(async (url: string) => {
        if (url === `${baseUrl}/health`) {
          return {
            ok: true,
            json: async () => ({ status: 'error' }),
          } as Response;
        }
        throw new Error('Unexpected URL');
      });

      await assert.rejects(unhealthyClient.ensureHealthy(), PinchtabError);
      assert(unhealthyCalled);
    });

    it('should throw detailed error when health fails and no callback', async () => {
      mockFetch.mock.mockImplementation(async (url: string) => {
        if (url === `${baseUrl}/health`) {
          return {
            ok: true,
            json: async () => ({ status: 'disconnected', error: 'get targets: context canceled' }),
          } as Response;
        }
        throw new Error('Unexpected URL');
      });

      await assert.rejects(
        client.ensureHealthy(),
        /Pinchtab is running but Chrome is not connected/
      );
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mock.mockImplementation(async () => {
        throw new Error('Network error');
      });

      await assert.rejects(
        client.ensureHealthy(),
        /Pinchtab is running but Chrome is not connected/
      );
    });

    it('should retry health check after restart', async () => {
      let restartCount = 0;
      let healthChecks = 0;
      
      const onUnhealthy = async (): Promise<void> => {
        restartCount++;
      };
      
      const unhealthyClient = new PinchtabClient(baseUrl, token, 30000, onUnhealthy);
      
      mockFetch.mock.mockImplementation(async (url: string) => {
        if (url === `${baseUrl}/health`) {
          healthChecks++;
          if (healthChecks === 1) {
            return {
              ok: true,
              json: async () => ({ status: 'error' }),
            } as Response;
          } else {
            return {
              ok: true,
              json: async () => ({ status: 'ok' }),
            } as Response;
          }
        }
        throw new Error('Unexpected URL');
      });

      await assert.doesNotReject(unhealthyClient.ensureHealthy());
      assert.strictEqual(restartCount, 1);
      assert.strictEqual(healthChecks, 2);
    });
  });

  describe('rawHealth', () => {
    let client: PinchtabClient;
    let mockFetch: ReturnType<typeof mock.fn>;

    beforeEach(() => {
      mockFetch = mock.fn();
      global.fetch = mockFetch as unknown as typeof global.fetch;
      client = new PinchtabClient(baseUrl, token);
    });

    afterEach(() => {
      mock.restoreAll();
    });

    it('should return status ok when server responds with ok', async () => {
      mockFetch.mock.mockImplementation(async (url: string) => {
        if (url === `${baseUrl}/health`) {
          return {
            ok: true,
            json: async () => ({ status: 'ok' }),
          } as Response;
        }
        throw new Error('Unexpected URL');
      });

      const result = await client['rawHealth']();
      assert.strictEqual(result.status, 'ok');
    });

    it('should return status error when server responds with error', async () => {
      mockFetch.mock.mockImplementation(async (url: string) => {
        if (url === `${baseUrl}/health`) {
          return {
            ok: true,
            json: async () => ({ status: 'error' }),
          } as Response;
        }
        throw new Error('Unexpected URL');
      });

      const result = await client['rawHealth']();
      assert.strictEqual(result.status, 'error');
    });

    it('should return status error when server returns non-ok response', async () => {
      mockFetch.mock.mockImplementation(async (url: string) => {
        if (url === `${baseUrl}/health`) {
          return {
            ok: false,
            status: 500,
          } as Response;
        }
        throw new Error('Unexpected URL');
      });

      const result = await client['rawHealth']();
      assert.strictEqual(result.status, 'error');
    });

    it('should return status error when network fails', async () => {
      mockFetch.mock.mockImplementation(async () => {
        throw new Error('Network error');
      });

      const result = await client['rawHealth']();
      assert.strictEqual(result.status, 'error');
    });
  });
});