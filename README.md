# Pinchtab MCP Wrapper

[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An MCP (Model Context Protocol) server that exposes the full [Pinchtab](https://github.com/pinchtab/pinchtab) browser API to AI coding agents. Built with token efficiency in mind — perfect for data extraction, web scraping, and automated testing workflows.

**🙏 Credits:** This wrapper is built on top of the excellent [Pinchtab](https://github.com/pinchtab/pinchtab) project by [Luigi Agosti](https://github.com/luigi-agosti) and the Pinchtab team. Pinchtab is a lightweight 12MB Go binary that provides browser automation via HTTP API with accessibility-first snapshots.

---

## Why Use Pinchtab for AI Agents?

When AI agents need to browse the web, efficiency matters. Pinchtab delivers **5-13x cost savings** compared to traditional browser automation.

### Cost Comparison (Real Numbers)

| Task | Traditional Browser | Pinchtab | Savings |
|------|-------------------|----------|---------|
| Extract article text | ~10,000 tokens (full DOM) | **~800 tokens** | **12.5x cheaper** |
| Find interactive elements | ~10,500 tokens | **~3,600 tokens** | **3x cheaper** |
| 50-page monitoring task | ~$0.30 | **~$0.01** | **30x cheaper** |

### Key Advantages for AI Workflows

**1. Data Extraction & Web Scraping**
- Extract clean, structured text without HTML overhead
- Accessibility tree provides semantic structure (roles, labels, states)
- Filter to interactive elements only when needed

**2. Website Change Monitoring**
- `diff=true` returns only changed elements since last snapshot
- Track price changes, content updates, or availability
- Monitor 50+ pages without context overflow

**3. Async Multi-Tab Operations**
- Run 20+ tabs simultaneously (vs 3-5 with Playwright)
- Tab locking prevents conflicts between agents
- Each tab ~1MB RAM vs 50MB+ for full browser instances

**4. Stable Automation**
- Stable element references (`e0`, `e1`) survive CSS changes
- No brittle CSS selectors that break on redesigns
- Works with sites that block traditional automation (stealth mode)

---

## Quick Start

### One-Line Installation

```bash
curl -fsSL https://raw.githubusercontent.com/BDuba/pinchtab-mcp-wrapper/main/install.sh | bash
```

**Requirements:** Docker, Node.js 18+, npm

**Then restart your AI agent (OpenCode, Claude Code, etc.)**

### Test It

```
Open https://example.com and take a screenshot
```

Or use commands:
```
/browse https://example.com
/screenshot
```

---

## Use Cases & Examples

### 1. Web Scraping at Scale

**Problem:** Extract product prices from 100 e-commerce pages

**Traditional approach:**
- Load full DOM (~10,000 tokens per page)
- Parse HTML manually
- Cost: 1,000,000 tokens (~$3.00)

**Pinchtab approach:**
```javascript
// Extract structured text only
pinchtab_read_page({url: "https://store.com/product"})
// Returns clean text with prices, descriptions
```
- Cost: 80,000 tokens (~$0.24)
- **Savings: $2.76 (12.5x cheaper)**

### 2. Change Detection & Monitoring

**Problem:** Monitor competitor prices or news updates

```javascript
// First visit - establish baseline
snapshot1 = pinchtab_snapshot({url: "https://competitor.com/prices"})

// Later visits - get only changes
diff = pinchtab_snapshot({
  url: "https://competitor.com/prices", 
  diff: true
})
// Returns only modified elements (50-200 tokens vs 10,000)
```

**Benefits:**
- Track 50 sites without context overflow
- Instant detection of changes
- 200x less data transfer

### 3. Multi-Source Research

**Problem:** Gather information from 10+ documentation sites simultaneously

```javascript
// Open multiple tabs in parallel
tab1 = pinchtab_tab_open({url: "https://docs.api1.com"})
tab2 = pinchtab_tab_open({url: "https://docs.api2.com"})
tab3 = pinchtab_tab_open({url: "https://docs.api3.com"})

// Extract text from all tabs
text1 = pinchtab_read_page({tabId: tab1.tabId})
text2 = pinchtab_read_page({tabId: tab2.tabId})
text3 = pinchtab_read_page({tabId: tab3.tabId})
```

**Benefits:**
- 20+ concurrent tabs
- No memory issues (1MB per tab)
- Async operations

### 4. Form Automation That Lasts

**Problem:** Automate login/checkout flows that break on website updates

**Traditional selectors break:**
```javascript
// Brittle - breaks when CSS changes
await page.click('#login-btn')  // ❌
```

**Pinchtab stable refs:**
```javascript
// Stable - survives redesigns
pinchtab_action({
  tabId: "...",
  kind: "click",
  ref: "e5"  // ✅ Persistent reference
})
```

### 5. Accessibility-First Testing

**Built-in accessibility tree:**
- Element roles (button, link, heading)
- Accessible names and labels
- Focus states and visibility
- Screen reader compatible

```javascript
// Get only interactive elements
interactives = pinchtab_list_interactives()
// Returns: buttons, links, inputs with labels
```

---

## Available Tools

| Tool | Purpose |
|------|---------|
| `pinchtab_tab_open` | Open URL in new tab |
| `pinchtab_read_page` | Extract page text (token-efficient) |
| `pinchtab_list_interactives` | Get clickable elements |
| `pinchtab_snapshot` | Get accessibility tree |
| `pinchtab_action` | Click, type, fill forms |
| `pinchtab_screenshot` | Take JPEG screenshot |
| `pinchtab_evaluate` | Run JavaScript |
| `pinchtab_tab_lock` | Lock tab for exclusive access |

---

## CLI Integration

### OpenCode

Add to `~/.config/opencode/opencode.json`:

```json
{
  "\$schema": "https://opencode.ai/config.json",
  "mcp": {
    "pinchtab": {
      "type": "local",
      "command": ["~/.pinchtab-mcp-wrapper/run-mcp.sh"],
      "enabled": true
    }
  },
  "agent": {
    "browser": {
      "description": "Browser automation specialist",
      "prompt": "Use pinchtab MCP tools for all web browsing tasks. Prefer text extraction over screenshots for efficiency.",
      "tools": {
        "pinchtab*": true,
        "playwright*": false
      }
    }
  },
  "default_agent": "browser"
}
```

### Claude Code

Add to `.mcp.json`:

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

Add to `~/.config/zed/settings.json`:

```json
{
  "assistant": {
    "version": "2",
    "enabled": true
  },
  "context_servers": {
    "pinchtab": {
      "command": "bash",
      "args": ["~/.pinchtab-mcp-wrapper/run-mcp.sh"]
    }
  }
}
```

---

---

## Automatic Configuration for Multiple AI Agents

The installer now automatically detects and configures pinchtab for multiple AI agents:

- **OpenCode** (`~/.config/opencode/opencode.json`)
- **Claude Code** (`~/.mcp.json` or `./.mcp.json`)
- **Cursor** (`~/.config/Cursor/User/settings.json`)
- **Zed** (`~/.config/zed/settings.json`)

If a config file already exists, the installer will:
1. Create a backup (`.backup.YYYYMMDD_HHMMSS`)
2. Automatically merge pinchtab configuration using Node.js
3. Preserve all existing settings

No manual editing required - just run the installer and restart your AI agent!

## Installation Options

The install script now supports automatic mode detection and graceful fallback:

### Automatic Mode (Default)

The installer automatically detects your environment and chooses the best mode:

```bash
curl -fsSL https://raw.githubusercontent.com/BDuba/pinchtab-mcp-wrapper/main/install.sh | bash
```

**What happens:**
1. Checks for Docker (including macOS-specific paths: Homebrew, OrbStack, Docker Desktop)
2. If Docker is available → builds Docker image and uses `docker` mode
3. If Docker is unavailable → automatically downloads Pinchtab binary and uses `external` mode

### Docker Mode

Recommended for most users. Requires Docker to be installed.

```bash
export PINCHTAB_MODE=docker
curl -fsSL https://raw.githubusercontent.com/BDuba/pinchtab-mcp-wrapper/main/install.sh | bash
```

### External Mode (Binary)

For systems without Docker. The installer automatically downloads the Pinchtab binary for your architecture.

```bash
export PINCHTAB_MODE=external
curl -fsSL https://raw.githubusercontent.com/BDuba/pinchtab-mcp-wrapper/main/install.sh | bash
```

### macOS Support

The installer automatically detects Docker in the following locations:
- `/opt/homebrew/bin/docker` (Homebrew on Apple Silicon)
- `/usr/local/bin/docker` (Homebrew on Intel)
- `/Applications/OrbStack.app/Contents/MacOS/../bin/docker` (OrbStack)
- `/Applications/Docker.app/Contents/Resources/bin/docker` (Docker Desktop)
- `~/.docker/bin/docker` (Docker Desktop alternative)

You can also manually specify the Docker path:

```bash
export DOCKER_PATH=/opt/homebrew/bin/docker
curl -fsSL https://raw.githubusercontent.com/BDuba/pinchtab-mcp-wrapper/main/install.sh | bash
```

## Manual Installation

```bash
# Clone
git clone https://github.com/BDuba/pinchtab-mcp-wrapper.git
cd pinchtab-mcp-wrapper

# Build
npm install && npm run build

# Build Docker image
docker build -f pinchtab.Dockerfile -t pinchtab:local .

# Create wrapper
cat > run-mcp.sh << 'EOF'
#!/bin/bash
export PINCHTAB_MODE=docker
export PINCHTAB_TOKEN=opencode-browser-token-secure
export PINCHTAB_DOCKER_IMAGE=pinchtab:local
exec node "$(dirname "$0")/dist/index.js"
EOF
chmod +x run-mcp.sh
```

---

## Configuration

### Screenshot File Delivery (New)

When using `delivery: "file"`, you can now use relative paths and auto-naming:

```json
{
  "tool": "screenshot",
  "params": {
    "delivery": "file"
    // Auto-saved to: ~/Pictures/Screenshots/2026-02-21T12-34-56-tab-123.jpg
  }
}
```

```json
{
  "tool": "screenshot",
  "params": {
    "delivery": "file",
    "path": "google/homepage.jpg"
    // Saved to: ~/Pictures/Screenshots/google/homepage.jpg
  }
}
```

```json
{
  "tool": "screenshot",
  "params": {
    "delivery": "file",
    "path": "/absolute/path/to/screenshot.png"
    // Absolute paths still work as before
  }
}
```

| Variable | Description | Default |
|----------|-------------|---------|
| `SCREENSHOTS_DIR` | Base directory for screenshots | OS-specific (~/Pictures/Screenshots) |
| `SCREENSHOTS_AUTO_CREATE` | Auto-create directories | `true` |
| `SCREENSHOTS_PATTERN` | Filename pattern | `{timestamp}-{tabId}.jpg` |


### Environment Variables

```bash
PINCHTAB_MODE=docker              # docker | external
PINCHTAB_TOKEN=secret-token       # Auth token
DEFAULT_SNAPSHOT_FORMAT=compact   # compact | text | json
DEFAULT_MAX_TOKENS=2500           # Token budget
SCREENSHOT_DEFAULT_DELIVERY=base64 # base64 | s3 | file
```

### Pinchtab Options (via Docker)

```bash
BRIDGE_STEALTH=full          # Bypass bot detection
BRIDGE_BLOCK_IMAGES=true     # Faster loading
BRIDGE_NO_ANIMATIONS=true    # Consistent snapshots
BRIDGE_TIMEOUT=30            # Action timeout (seconds)
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Connection closed" | Check `docker ps`, verify container running |
| "MCP error -32000" | Restart AI agent completely |
| Health check timeout | `docker logs pinchtab` for errors |
| 401 errors | Verify PINCHTAB_TOKEN matches |

---

## Token Efficiency Guide

**Best practices for minimizing costs:**

1. **Use `/text` for reading** - 800 tokens vs 10,000 for DOM
2. **Filter interactives** - 3,600 tokens vs 10,500 for full page
3. **Use `diff=true`** - Only changed elements (50-200 tokens)
4. **Block images/media** - Faster loading, less noise
5. **Lock tabs** - Prevent conflicts, avoid re-work

---

## Development

```bash
npm install
npm run build
npm test
```

---

## Credits & License

This MCP wrapper is built on [Pinchtab](https://github.com/pinchtab/pinchtab) by Luigi Agosti and contributors.

- Pinchtab: [github.com/pinchtab/pinchtab](https://github.com/pinchtab/pinchtab)
- MCP Protocol: [modelcontextprotocol.io](https://modelcontextprotocol.io/)

MIT License
