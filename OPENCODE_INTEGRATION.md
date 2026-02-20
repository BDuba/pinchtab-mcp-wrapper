# Pinchtab MCP Wrapper - OpenCode Integration

## Configuration

To use pinchtab-mcp-wrapper with OpenCode, add the following to your OpenCode configuration:

### Option 1: Docker Mode (Auto-start Pinchtab)

```json
{
  "mcpServers": {
    "pinchtab": {
      "command": "node",
      "args": ["/path/to/pinchtab-mcp-wrapper/dist/index.js"],
      "env": {
        "PINCHTAB_MODE": "docker",
        "PINCHTAB_TOKEN": "your-secure-token",
        "PINCHTAB_DOCKER_IMAGE": "pinchtab/pinchtab:v0.4.0",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Option 2: External Mode (Connect to running Pinchtab)

```json
{
  "mcpServers": {
    "pinchtab": {
      "command": "node",
      "args": ["/path/to/pinchtab-mcp-wrapper/dist/index.js"],
      "env": {
        "PINCHTAB_MODE": "external",
        "PINCHTAB_URL": "http://127.0.0.1:9867",
        "PINCHTAB_TOKEN": "your-secure-token",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## Testing the Integration

### 1. Start Pinchtab manually (for external mode)

```bash
docker run -d \
  --name pinchtab \
  -p 127.0.0.1:9867:9867 \
  -e BRIDGE_TOKEN="test-token" \
  --security-opt seccomp=unconfined \
  -v "$HOME/.pinchtab:/data" \
  pinchtab/pinchtab:v0.4.0
```

### 2. Test the MCP server directly

```bash
cd /root/pinchtab-mcp-wrapper
node dist/index.js
```

### 3. Available Tools

Once connected to OpenCode, the following tools become available:

#### Tab Management
- `tab_list` - List all open tabs
- `tab_open` - Open a new tab
- `tab_close` - Close a tab
- `navigate` - Navigate to a URL

#### Page Content
- `read_page` - Extract clean text from page (token-efficient)
- `text` - Extract raw text from page
- `snapshot` - Get accessibility snapshot
- `list_interactives` - List interactive elements only
- `read_region` - Read specific region by CSS selector
- `observe_changes` - Get only changed elements (diff mode)

#### Actions
- `action` - Click, type, fill, scroll, etc.
- `evaluate` - Execute JavaScript

#### Screenshots
- `screenshot` - Take screenshot (base64, S3, or file)

#### Multi-agent Safety
- `tab_lock` - Lock tab for exclusive access
- `tab_unlock` - Release tab lock

#### Health
- `pinchtab_health` - Check Pinchtab status

## Example Usage in OpenCode

```
User: Open https://example.com and take a screenshot

Agent: I'll open the page and take a screenshot for you.

[Uses tab_open -> navigate -> screenshot tools]

Result: { mime: 'image/jpeg', bytesBase64: '...' }
```

## Comparison with Default Agent

### Default Agent (no browser tools)
- Cannot interact with web pages
- Cannot take screenshots
- Cannot execute JavaScript on pages
- Limited to text-based reasoning

### With Pinchtab MCP Wrapper
- Full browser automation
- Screenshot capture (base64, S3, file)
- Page interaction (click, type, scroll)
- JavaScript execution
- Token-efficient page reading
- Multi-agent coordination via tab locks

## Troubleshooting

### Issue: "Pinchtab client not initialized"
- Check PINCHTAB_URL and PINCHTAB_TOKEN are correct
- Verify Pinchtab container is running: `docker ps`

### Issue: "Authentication failed"
- Verify BRIDGE_TOKEN matches PINCHTAB_TOKEN
- Check token is being passed correctly

### Issue: "Docker not found"
- Ensure Docker is installed and running
- Check user has permissions to run Docker

### Issue: Port conflicts
- Change PINCHTAB_PORT to use different port
- Ensure port 9867 is not already in use
