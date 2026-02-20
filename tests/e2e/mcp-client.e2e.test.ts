import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

describe('E2E Tests - MCP Client', () => {
  let client: Client;
  let transport: StdioClientTransport;

  before(async () => {
    transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/index.js'],
      env: {
        PINCHTAB_MODE: 'docker',
        PINCHTAB_TOKEN: 'e2e-test-token',
        LOG_LEVEL: 'warn',
      },
    });

    client = new Client({ name: 'test-client', version: '1.0.0' });
    await client.connect(transport);
  });

  after(async () => {
    await client.close();
  });

  it('should list available tools', async () => {
    const tools = await client.listTools();
    assert.ok(tools.tools.length > 0);
    
    const toolNames = tools.tools.map(t => t.name);
    assert.ok(toolNames.includes('pinchtab_health'));
    assert.ok(toolNames.includes('tab_list'));
    assert.ok(toolNames.includes('read_page'));
    assert.ok(toolNames.includes('screenshot'));
  });

  it('should call health tool', async () => {
    const result = await client.callTool({
      name: 'pinchtab_health',
      arguments: {},
    });
    
    assert.ok(result);
  });
});
