
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
}

async function runTests(): Promise<void> {
  console.log('=== Pinchtab MCP Wrapper Test Runner ===\n');
  
  const suites: TestSuite[] = [];
  
  // Test 1: Server Startup
  const startupSuite: TestSuite = { name: 'Server Startup', tests: [] };
  
  const startTime = Date.now();
  try {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/index.js'],
      env: {
        PINCHTAB_MODE: 'external',
        PINCHTAB_URL: 'http://127.0.0.1:9867',
        PINCHTAB_TOKEN: 'test-token',
        LOG_LEVEL: 'error',
      },
    });

    const client = new Client({ name: 'test-runner', version: '1.0.0' });
    await client.connect(transport);
    
    startupSuite.tests.push({
      name: 'Connect to MCP server',
      passed: true,
      duration: Date.now() - startTime,
    });

    // Test 2: Tool Discovery
    const discoveryStart = Date.now();
    try {
      const tools = await client.listTools();
      startupSuite.tests.push({
        name: 'List tools',
        passed: true,
        duration: Date.now() - discoveryStart,
      });

      const expectedTools = [
        'pinchtab_health',
        'tab_list',
        'tab_open',
        'tab_close',
        'navigate',
        'snapshot',
        'text',
        'action',
        'evaluate',
        'tab_lock',
        'tab_unlock',
        'screenshot',
        'read_page',
        'list_interactives',
        'observe_changes',
        'read_region',
      ];

      const toolNames = tools.tools.map(t => t.name);
      const missingTools = expectedTools.filter(t => !toolNames.includes(t));
      
      startupSuite.tests.push({
        name: `Verify all 16 tools registered (missing: ${missingTools.length})`,
        passed: missingTools.length === 0,
        duration: 0,
        error: missingTools.length > 0 ? `Missing: ${missingTools.join(', ')}` : undefined,
      });
    } catch (error) {
      startupSuite.tests.push({
        name: 'List tools',
        passed: false,
        duration: Date.now() - discoveryStart,
        error: String(error),
      });
    }

    // Test 3: Health Check
    const healthStart = Date.now();
    try {
      await client.callTool({
        name: 'pinchtab_health',
        arguments: {},
      });
      startupSuite.tests.push({
        name: 'Health check',
        passed: true,
        duration: Date.now() - healthStart,
      });
    } catch (error) {
      startupSuite.tests.push({
        name: 'Health check',
        passed: false,
        duration: Date.now() - healthStart,
        error: String(error),
      });
    }

    await client.close();
  } catch (error) {
    startupSuite.tests.push({
      name: 'Connect to MCP server',
      passed: false,
      duration: Date.now() - startTime,
      error: String(error),
    });
  }
  
  suites.push(startupSuite);
  
  // Print results
  let totalTests = 0;
  let passedTests = 0;
  
  for (const suite of suites) {
    console.log(`\n📦 ${suite.name}`);
    console.log('─'.repeat(50));
    
    for (const test of suite.tests) {
      totalTests++;
      if (test.passed) passedTests++;
      
      const icon = test.passed ? '✅' : '❌';
      const duration = test.duration > 0 ? `(${test.duration}ms)` : '';
      console.log(`${icon} ${test.name} ${duration}`);
      
      if (test.error) {
        console.log(`   Error: ${test.error}`);
      }
    }
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log(`📊 Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed');
    process.exit(1);
  }
}

runTests();
