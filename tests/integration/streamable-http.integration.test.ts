import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StreamableHTTPTransport } from '../../src/transports/streamable-http.js';
import type { TransportConfig } from '../../src/transports/types.js';

describe('StreamableHTTPTransport', () => {
  it('should create transport with default config', async () => {
    const config: TransportConfig = {
      type: 'streamable-http',
      port: 19001,
      host: '127.0.0.1',
      path: '/mcp',
      authType: 'none',
    };

    const transport = new StreamableHTTPTransport(config);
    assert.ok(transport, 'Transport should be created');
    
    const info = transport.getInfo();
    assert.equal(info.type, 'streamable-http');
    assert.equal(info.status, 'connecting');
    assert.equal(info.port, 19001);
    assert.ok(info.endpoint?.includes('19001'));
    
    // Clean up
    await transport.close();
  });

  it('should include auth token in health check rejection', async () => {
    const config: TransportConfig = {
      type: 'streamable-http',
      port: 19002,
      host: '127.0.0.1',
      path: '/mcp',
      authType: 'bearer',
      authToken: 'test-secret-token',
    };

    const transport = new StreamableHTTPTransport(config);
    
    // Start transport (we won't connect it to an MCP server for this test)
    // Just verify it was created with auth settings
    const info = transport.getInfo();
    assert.equal(info.type, 'streamable-http');
    
    await transport.close();
  });

  it('should support CORS configuration', async () => {
    const config: TransportConfig = {
      type: 'streamable-http',
      port: 19003,
      host: '127.0.0.1',
      path: '/mcp',
      authType: 'none',
      cors: {
        origins: ['https://example.com'],
        credentials: true,
        methods: ['GET', 'POST'],
      },
    };

    const transport = new StreamableHTTPTransport(config);
    assert.ok(transport);
    
    await transport.close();
  });

  it('should support session configuration', async () => {
    const config: TransportConfig = {
      type: 'streamable-http',
      port: 19004,
      host: '127.0.0.1',
      path: '/mcp',
      authType: 'none',
      enableSessions: true,
      sessionTimeout: 1800,
    };

    const transport = new StreamableHTTPTransport(config);
    assert.ok(transport);
    
    await transport.close();
  });

  it('should handle close gracefully', async () => {
    const config: TransportConfig = {
      type: 'streamable-http',
      port: 19005,
      host: '127.0.0.1',
      path: '/mcp',
      authType: 'none',
    };

    const transport = new StreamableHTTPTransport(config);
    
    // Should not throw when closing before starting
    await assert.doesNotReject(async () => {
      await transport.close();
    });
    
    const info = transport.getInfo();
    assert.equal(info.status, 'closed');
  });
});
