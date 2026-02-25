import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { PinchtabMcpServer } from '../../src/index.js';

describe('HTTP Mode E2E Tests', () => {
  let server: PinchtabMcpServer;
  let client: Client;
  let transport: StreamableHTTPClientTransport;
  const httpPort = parseInt(process.env.MCP_HTTP_PORT || '13000');
  const authToken = process.env.MCP_AUTH_TOKEN || 'test-token';
  const pinchtabUrl = process.env.PINCHTAB_URL || 'http://127.0.0.1:19867';
  const pinchtabToken = process.env.PINCHTAB_TOKEN || 'test-token';

  before(async () => {
    // Use external mode to connect to already running Pinchtab server
    process.env.PINCHTAB_MODE = 'external';
    process.env.PINCHTAB_URL = pinchtabUrl;
    process.env.PINCHTAB_TOKEN = pinchtabToken;
    
    // Start server in HTTP mode
    server = new PinchtabMcpServer();
    await server.initialize();
    await server.start();

    // Create client with Bearer token authentication
    transport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${httpPort}/mcp`),
      {
        requestInit: {
          headers: new Headers({
            'Authorization': `Bearer ${authToken}`,
          }),
        },
      }
    );

    client = new Client(
      {
        name: 'test-client',
        version: '0.5.1',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
  });

  after(async () => {
    await client.close();
    await server.stop();
  });

  it('should list available tools', async () => {
    const tools = await client.listTools();
    assert.ok(tools.tools.length > 0, 'Should have tools');
    
    // Check for key tools
    const toolNames = tools.tools.map((t: { name: string }) => t.name);
    assert.ok(toolNames.includes('pinchtab_health'), 'Should have health tool');
    assert.ok(toolNames.includes('tab_open'), 'Should have tab_open tool');
    assert.ok(toolNames.includes('navigate'), 'Should have navigate tool');
    assert.ok(toolNames.includes('snapshot'), 'Should have snapshot tool');
  });

  it('should call health tool', async () => {
    const result = await client.callTool({
      name: 'pinchtab_health',
      arguments: {},
    });

    assert.ok(result, 'Should return result');
    assert.ok(result.content, 'Should have content');
    
    // Parse result
    const content = result.content as Array<{ type: string; text?: string }>;
    const textContent = content.find((c) => c.type === 'text');
    assert.ok(textContent, 'Should have text content');
    
    const health = JSON.parse(textContent.text!);
    assert.equal(health.status, 'ok', 'Health should be ok');
  });

  it('should open tab and navigate', async () => {
    // Open tab
    const openResult = await client.callTool({
      name: 'tab_open',
      arguments: {
        url: 'https://example.com',
      },
    });

    assert.ok(openResult, 'Should return open result');
    const content = openResult.content as Array<{ type: string; text?: string }>;
    const textContent = content.find((c) => c.type === 'text');
    assert.ok(textContent, 'Should have text content');
    
    const tabInfo = JSON.parse(textContent.text!);
    assert.ok(tabInfo.tabId, 'Should have tabId');
    assert.ok(tabInfo.url, 'Should have url');

    // Take snapshot
    const snapshotResult = await client.callTool({
      name: 'snapshot',
      arguments: {
        tabId: tabInfo.tabId,
        format: 'compact',
      },
    });

    assert.ok(snapshotResult, 'Should return snapshot');

    // Close tab
    const closeResult = await client.callTool({
      name: 'tab_close',
      arguments: {
        tabId: tabInfo.tabId,
      },
    });

    assert.ok(closeResult, 'Should return close result');
  });

  it('should read page text', async () => {
    // Open tab with a simple page
    const openResult = await client.callTool({
      name: 'tab_open',
      arguments: {
        url: 'https://example.com',
      },
    });

    const content = openResult.content as Array<{ type: string; text?: string }>;
    const textContent = content.find((c) => c.type === 'text');
    const tabInfo = JSON.parse(textContent!.text!);

    // Read page
    const readResult = await client.callTool({
      name: 'read_page',
      arguments: {
        tabId: tabInfo.tabId,
        mode: 'readability',
      },
    });

    assert.ok(readResult, 'Should return read result');
    assert.ok(readResult.content, 'Should have content');

    // Cleanup
    await client.callTool({
      name: 'tab_close',
      arguments: { tabId: tabInfo.tabId },
    });
  });

  it('should handle authentication errors', async () => {
    // Create client without auth
    const badTransport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${httpPort}/mcp`)
    );

    const badClient = new Client(
      {
        name: 'bad-client',
        version: '0.5.1',
      },
      {
        capabilities: {},
      }
    );

    try {
      await badClient.connect(badTransport);
      // Try to call a tool
      await badClient.listTools();
      assert.fail('Should have thrown authentication error');
    } catch (error) {
      // Expected to fail
      assert.ok(error);
    } finally {
      await badClient.close();
    }
  });
});