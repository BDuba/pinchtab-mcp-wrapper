# pinchtab-mcp-wrapper

An MCP (Model Context Protocol) **stdio** server that exposes the full Pinchtab browser API to AI coding agents — with token-efficient "read-first" helpers, local-only defaults, and optional screenshot delivery via Base64 or S3.

## 🚀 One-Line Installation (Recommended)

Works with any MCP-compatible CLI tool (OpenCode, Claude Code, Cursor, Zed, etc.):

```bash
curl -fsSL https://raw.githubusercontent.com/pinchtab/pinchtab-mcp-wrapper/main/install.sh | bash
```

This will:
- ✅ Check dependencies (Docker, Node.js, npm)
- ✅ Clone and build the project
- ✅ Build the Pinchtab Docker image
- ✅ Configure your CLI tool automatically (OpenCode, Claude Code, etc.)
- ✅ Create agent instructions

**Then restart your CLI tool and you're ready to go!**

### Quick Test

After installation, test with:
```
открой https://example.com и сделай скриншот
```

Or use the browse command:
```
/browse https://example.com
```

## Why this exists

Pinchtab is a standalone HTTP server that drives a real Chromium/Chrome instance and returns accessibility-first snapshots and ultra-cheap page text. This wrapper turns that HTTP API into an MCP toolset so agent runtimes (like opencode) can use a browser reliably without bespoke integrations.

Key goals:
- Full browser control (tabs, navigation, actions, evaluation, cookies, screenshots).
- Token efficiency (prefer `/text`, interactive-only snapshots, diffs, truncation).
- Local-only operation (stdio + loopback).
- Multi-agent coordination via tab locking.
- Works on machines **without system Chrome** (run Pinchtab in Docker with bundled Chromium).

## Prerequisites

- Node.js 18+
- Docker (for running Pinchtab in containerized mode)
- npm or yarn

## Quick Start

### Option 1: One-Line Installer (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/pinchtab/pinchtab-mcp-wrapper/main/install.sh | bash
```

After installation:
1. Restart OpenCode completely
2. Run `/status` to verify pinchtab is working
3. Try: `открой https://example.com и сделай скриншот`

### Option 2: Manual Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd pinchtab-mcp-wrapper

# 2. Install dependencies and build
npm install
npm run build

# 3. Build the Pinchtab Docker image
docker build -f pinchtab.Dockerfile -t pinchtab:local .

# 4. Create wrapper script
cat > run-mcp.sh << 'EOF'
#!/bin/bash
export PINCHTAB_MODE=docker
export PINCHTAB_TOKEN=opencode-browser-token-secure
export PINCHTAB_DOCKER_IMAGE=pinchtab:local
export DEFAULT_SNAPSHOT_FORMAT=compact
export DEFAULT_MAX_TOKENS=2500
export SCREENSHOT_DEFAULT_DELIVERY=base64
export LOG_LEVEL=info
exec node "$(dirname "$0")/dist/index.js"
EOF
chmod +x run-mcp.sh

# 5. Configure OpenCode
mkdir -p ~/.config/opencode
cat > ~/.config/opencode/opencode.json << EOF
{
  "\$schema": "https://opencode.ai/config.json",
  "mcp": {
    "pinchtab": {
      "type": "local",
      "command": ["$(pwd)/run-mcp.sh"],
      "enabled": true
    }
  }
}
EOF
```

### Option 3: External Mode (Bring Your Own Pinchtab)

Use this if you already have Pinchtab running separately.

```bash
# 1. Start Pinchtab container manually
docker run -d \
  --name pinchtab \
  -p 127.0.0.1:9867:9867 \
  -e BRIDGE_TOKEN="your-secret-token" \
  -e BRIDGE_BIND=0.0.0.0 \
  --security-opt seccomp=unconfined \
  -v "$HOME/.pinchtab:/data" \
  pinchtab:local

# 2. Run the MCP server in external mode
export PINCHTAB_MODE=external
export PINCHTAB_URL=http://127.0.0.1:9867
export PINCHTAB_TOKEN=your-secret-token

node dist/index.js
```
Important: MCP stdio servers must not print to stdout. This project logs to stderr only.

## 🎯 Usage Examples

### Basic browser automation

```
открой https://mts.ru и сделай скриншот
```

### Multi-step workflow

```
1. Открой https://github.com/login через pinchtab_tab_open
2. Получи структуру страницы через pinchtab_snapshot
3. Найди поле для ввода username по ref
4. Введи текст через pinchtab_action с kind: "type"
```

### Extract page text

```
прочитай текст страницы https://example.com используя pinchtab_read_page
```

### Take screenshot

```
сделай скриншот текущей страницы с качеством 90%
```

## Available Tools

When pinchtab MCP is active, you have access to these tools:

| Tool | Description |
|------|-------------|
| `pinchtab_health` | Check server status |
| `pinchtab_tab_list` | List all browser tabs |
| `pinchtab_tab_open` | Open a new tab with URL |
| `pinchtab_tab_close` | Close a specific tab |
| `pinchtab_navigate` | Navigate to URL in existing tab |
| `pinchtab_snapshot` | Get accessibility tree |
| `pinchtab_text` | Extract page text |
| `pinchtab_read_page` | Macro: read page content |
| `pinchtab_list_interactives` | Macro: list interactive elements |
| `pinchtab_action` | Click, type, fill, press, focus, hover |
| `pinchtab_evaluate` | Execute JavaScript |
| `pinchtab_screenshot` | Take screenshot (base64 or file) |
| `pinchtab_tab_lock` | Lock tab for exclusive access |
| `pinchtab_tab_unlock` | Unlock tab |

## 🖥️ CLI Integration

Pinchtab MCP works with various AI coding agents and CLI tools that support the Model Context Protocol (MCP).

### OpenCode

The recommended configuration for OpenCode (includes agent setup):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "pinchtab": {
      "type": "local",
      "command": ["/path/to/pinchtab-mcp-wrapper/run-mcp.sh"],
      "enabled": true
    }
  },
  "agent": {
    "browser": {
      "description": "Browser automation agent using pinchtab",
      "prompt": "You are a browser automation specialist. When the user asks to open websites, take screenshots, extract text, or interact with web pages, ALWAYS use pinchtab MCP tools. Never use playwright or other browser tools unless explicitly requested.",
      "tools": {
        "pinchtab*": true,
        "playwright*": false
      }
    }
  },
  "default_agent": "browser",
  "command": {
    "browse": {
      "template": "Open $ARGUMENTS in the browser using pinchtab, then take a screenshot",
      "description": "Open URL and take screenshot",
      "agent": "browser"
    },
    "screenshot": {
      "template": "Take a screenshot of the current page using pinchtab_screenshot",
      "description": "Take browser screenshot",
      "agent": "browser"
    }
  }
}
```

Verify it's working:
```
/status
```

### Claude Code

For Claude Code, add to your `.mcp.json` or `claude.config.json`:

```json
{
  "mcpServers": {
    "pinchtab": {
      "command": "bash",
      "args": ["-c", "PINCHTAB_MODE=docker PINCHTAB_TOKEN=opencode-browser-token-secure PINCHTAB_DOCKER_IMAGE=pinchtab:local node ~/.pinchtab-mcp-wrapper/dist/index.js"]
    }
  }
}
```

Or use the wrapper script:
```json
{
  "mcpServers": {
    "pinchtab": {
      "command": "bash",
      "args": ["~/.pinchtab-mcp-wrapper/run-mcp.sh"]
    }
  }
}
```

### Cursor

Add to Cursor's MCP settings (Settings → Features → MCP):

```json
{
  "mcpServers": {
    "pinchtab": {
      "type": "stdio",
      "command": "bash",
      "args": ["~/.pinchtab-mcp-wrapper/run-mcp.sh"]
    }
  }
}
```

### Zed

Add to your Zed settings (`~/.config/zed/settings.json`):

```json
{
  "assistant": {
    "version": "2",
    "enabled": true,
    "default_model": {
      "provider": "openai",
      "model": "gpt-4"
    },
    "always_allow_tools": ["pinchtab_*"]
  },
  "context_servers": {
    "pinchtab": {
      "command": "bash",
      "args": ["~/.pinchtab-mcp-wrapper/run-mcp.sh"]
    }
  }
}
```

### Generic MCP Client

For any MCP-compatible client, use this configuration:

```json
{
  "type": "stdio",
  "command": "bash",
  "args": [
    "-c",
    "export PINCHTAB_MODE=docker && export PINCHTAB_TOKEN=opencode-browser-token-secure && export PINCHTAB_DOCKER_IMAGE=pinchtab:local && node ~/.pinchtab-mcp-wrapper/dist/index.js"
  ]
}
```

Or simply:
```json
{
  "type": "stdio",
  "command": "~/.pinchtab-mcp-wrapper/run-mcp.sh"
}
```

### Environment Variables for All CLI Tools

Make sure these environment variables are set when running the MCP server:

```bash
PINCHTAB_MODE=docker                    # or "external" if running separately
PINCHTAB_TOKEN=your-secret-token        # authentication token
PINCHTAB_DOCKER_IMAGE=pinchtab:local    # Docker image to use
DEFAULT_SNAPSHOT_FORMAT=compact         # compact, text, or json
DEFAULT_MAX_TOKENS=2500                 # token limit for responses
SCREENSHOT_DEFAULT_DELIVERY=base64      # base64, s3, or file
LOG_LEVEL=info                          # debug, info, warn, error
```

## Configuration

### Wrapper env vars
- `PINCHTAB_MODE`: `auto` | `docker` | `external` (default: `auto`)
- `PINCHTAB_URL`: Pinchtab base URL (external mode)
- `PINCHTAB_TOKEN`: Bearer token (required for external mode)
- `PINCHTAB_DOCKER_IMAGE`: Docker image to run in `docker/auto` mode (default pinned)
- `PINCHTAB_STATE_DIR`: host path for persistent state/profile (default: `~/.pinchtab-mcp/state`)
- `DEFAULT_SNAPSHOT_FORMAT`: `compact` | `text` | `json` (default: `compact`)
- `DEFAULT_MAX_TOKENS`: snapshot truncation budget (default: 2500)

Screenshots:
- `SCREENSHOT_DEFAULT_DELIVERY`: `base64` | `s3`
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- `S3_PREFIX`, `S3_PUBLIC_URL_BASE`

Logging:
- `LOG_LEVEL`: `debug|info|warn|error` (stderr only)

### Pinchtab env vars (passed through in docker/auto)

Common ones:
- `BRIDGE_PORT`: HTTP server port (default: 9867)
- `BRIDGE_BIND`: Bind address (default: 127.0.0.1, use 0.0.0.0 for Docker containers)
- `BRIDGE_TOKEN`: Bearer token for auth
- `BRIDGE_HEADLESS`: Run Chrome headless (default: true)
- `BRIDGE_STATE_DIR`: State/session storage directory
- `BRIDGE_PROFILE`: Chrome profile directory
- `BRIDGE_STEALTH`: Stealth level: `light` | `full`
- `BRIDGE_BLOCK_IMAGES`: Block image loading
- `BRIDGE_BLOCK_MEDIA`: Block all media
- `BRIDGE_NO_ANIMATIONS`: Disable CSS animations
- `BRIDGE_TIMEOUT`: Action timeout in seconds
- `BRIDGE_NAV_TIMEOUT`: Navigation timeout in seconds

### Tooling overview (what the agent gets)

This MCP server exposes:
- Thin 1:1 tools for Pinchtab HTTP endpoints (health, tabs, navigate, snapshot, text, action, evaluate, lock/unlock, screenshot).
- Token-saver macros:
 - `read_page` (uses `/text`)
 - `list_interactives` (uses `/snapshot?filter=interactive&format=compact`)
 - `observe_changes` (uses `/snapshot?diff=true`)
 - `read_region` (uses `/snapshot?selector=...`)

### Multi-agent safety: tab locks

When multiple agents may touch the same tab, use:
- `tab_lock(tabId, owner, timeoutMs?)`
- `tab_unlock(tabId, owner)`

Locks are time-limited to prevent deadlocks. Always pass a stable `owner` identifier from the calling agent.

### Screenshots

- `delivery=base64`: returns `{ mime, bytesBase64, width?, height? }`
- `delivery=s3`: uploads and returns `{ url, bucket, key }`
- `delivery=file`: saves to disk and returns `{ path }`

## Security & Network Access

### Do I need a reverse proxy?

**No**, a reverse proxy is **NOT required** for local development. The service works securely out of the box:

- **Default configuration**: Pinchtab binds to `127.0.0.1` (localhost only)
- **Docker mode**: The container exposes port `9867` only on localhost (`127.0.0.1:9867`)
- **External access**: Not possible from other machines by default

You only need a reverse proxy if you want to:
1. **Expose Pinchtab to the internet** (not recommended for security)
2. **Add HTTPS/TLS termination** for secure remote access
3. **Route multiple services** through a single domain

### Security best practices

Pinchtab controls a real browser profile with real sessions/cookies. Treat state directories as secrets.
Recommendations:
- Always set a token (`BRIDGE_TOKEN`) and pass it via `PINCHTAB_TOKEN`.
- Bind Pinchtab to loopback only (`-p 127.0.0.1:9867:9867`) unless you really know what you're doing.
- Keep state directories (`~/.pinchtab-mcp/`, `~/.pinchtab/`) secure - they contain browser cookies and sessions
- Prefer disposable accounts when testing automation.
- Never expose Pinchtab directly to the internet without authentication

## Troubleshooting

### "Connection closed" or "MCP error -32000" error
- Check that the Pinchtab Docker image is built: `docker images | grep pinchtab`
- Verify the container is running: `docker ps | grep pinchtab`
- Check container logs: `docker logs pinchtab`

### "invalid IP address" error
This was a bug in older versions where Docker arguments weren't parsed correctly. Make sure you're using the latest code.

### "Unable to find image 'pinchtab/pinchtab:v0.4.0' locally"
The original Pinchtab image is not available on Docker Hub. Use the provided `pinchtab.Dockerfile` to build locally:
```bash
docker build -f pinchtab.Dockerfile -t pinchtab:local .
```

### Authentication failures (401)
- Verify `PINCHTAB_TOKEN` matches `BRIDGE_TOKEN`
- Check that the token is being passed correctly in your MCP configuration
- When running in Docker mode, the token is passed automatically to the container

### Health check timeout
- The container may be taking longer to start. Check `docker logs pinchtab` for startup errors
- Ensure Docker has enough resources allocated
- Verify port 9867 is not already in use: `lsof -i :9867`

## 💡 Recommendations

### For best results with AI agents:

1. **Use `pinchtab_read_page`** for extracting content - it's 5-13x cheaper than screenshots
2. **Use `pinchtab_list_interactives`** when you need to interact with page elements
3. **Use `pinchtab_snapshot` with `filter=interactive`** for compact representation
4. **Enable stealth mode** (`BRIDGE_STEALTH=full`) for sites with bot detection
5. **Use tab locking** when multiple agents work with the same browser instance

### Token efficiency comparison:

| Method | Tokens | Best for |
|--------|--------|----------|
| `/text` | ~800 | Reading content |
| Interactive snapshot | ~3,600 | Clicking/interacting |
| Full snapshot | ~10,500 | Complete page structure |
| Screenshot | ~2,000 | Visual verification |

### Quick command reference:

```bash
# Open website and screenshot
/browse https://example.com

# Take screenshot
/screenshot

# Direct tool usage
 pinchtab_tab_open {"url": "https://example.com"}
 pinchtab_screenshot {"tabId": "...", "quality": 80}
 pinchtab_read_page {"tabId": "..."}
```

## Development
```bash
npm install
npm run build
npm test
```

Integration tests (requires Docker):
```bash
npm run test:integration
```

E2E tests (MCP harness):
```bash
npm run test:e2e
```

## Versioning strategy
This wrapper pins a known-good Pinchtab image tag by default. You can override it via `PINCHTAB_DOCKER_IMAGE`.
Upgrade Pinchtab separately from the wrapper when needed.

## License
MIT
