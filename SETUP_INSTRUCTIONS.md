# OpenCode Setup Instructions for Pinchtab MCP

## ⚡ Quick Setup

### Step 1: Verify Build
```bash
cd /root/pinchtab-mcp-wrapper
ls dist/index.js
```
**Should show:** `dist/index.js` exists

### Step 2: Configuration

**Option A: User Config File**
```bash
# Copy config to OpenCode directory
cp /root/pinchtab-mcp-wrapper/opencode-config.json ~/.config/opencode/mcp.json
```

**Option B: Inline in OpenCode Settings**
```json
{
  "mcpServers": {
    "pinchtab": {
      "command": "node",
      "args": ["/root/pinchtab-mcp-wrapper/dist/index.js"],
      "env": {
        "PINCHTAB_MODE": "docker",
        "PINCHTAB_TOKEN": "opencode-browser-token-secure",
        "DEFAULT_SNAPSHOT_FORMAT": "compact",
        "DEFAULT_MAX_TOKENS": "2500",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Step 3: When to Reload OpenCode

🔄 **RELOAD OPENCODE NOW** if you have:
- ✅ Saved the configuration
- ✅ Verified dist/index.js exists
- ✅ Docker is running

**Reload command:**
```bash
# If OpenCode runs as service
systemctl restart opencode

# Or restart the application
# (depends on how OpenCode is installed)
```

## 🔍 Verification After Reload

### Test 1: Check Tools Available
```
Ask OpenCode: "List available tools"
Should see: pinchtab_health, tab_list, read_page, screenshot, etc.
```

### Test 2: Health Check
```
Ask OpenCode: "Check pinchtab health"
Should see: Status response from Pinchtab
```

### Test 3: Web Navigation
```
Ask OpenCode: "Open https://example.com and take a screenshot"
Should see: Screenshot in base64 format
```

## 🐛 Troubleshooting

### Issue: "Command not found"
**Solution:**
```bash
# Check Node.js is available
which node
# Should output: /usr/bin/node or similar

# If not, install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
```

### Issue: "Cannot find module"
**Solution:**
```bash
cd /root/pinchtab-mcp-wrapper
npm install
npm run build
```

### Issue: "Docker not found"
**Solution:**
```bash
# Check Docker status
systemctl status docker

# Start Docker if needed
systemctl start docker

# Or use external mode instead:
# Change PINCHTAB_MODE from "docker" to "external"
# And set PINCHTAB_URL to running Pinchtab instance
```

### Issue: "Connection refused"
**Solution:**
```bash
# Check if Pinchtab is running
docker ps | grep pinchtab

# If not running, start it manually:
docker run -d --name pinchtab -p 127.0.0.1:9867:9867 \
  -e BRIDGE_TOKEN="opencode-browser-token-secure" \
  pinchtab/pinchtab:v0.4.0
```

## 📝 Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PINCHTAB_MODE` | `auto` | `docker`, `external`, or `auto` |
| `PINCHTAB_TOKEN` | (generated) | Authentication token |
| `PINCHTAB_DOCKER_IMAGE` | `pinchtab:v0.4.0` | Docker image to use |
| `DEFAULT_SNAPSHOT_FORMAT` | `compact` | `compact`, `text`, `json` |
| `DEFAULT_MAX_TOKENS` | `2500` | Token limit for responses |
| `SCREENSHOT_DEFAULT_DELIVERY` | `base64` | `base64`, `s3`, `file` |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |

### Mode Selection

**Docker Mode (Recommended)**
```json
"PINCHTAB_MODE": "docker"
```
- Auto-starts Pinchtab container
- Self-contained
- Requires Docker

**External Mode**
```json
"PINCHTAB_MODE": "external",
"PINCHTAB_URL": "http://127.0.0.1:9867",
"PINCHTAB_TOKEN": "your-token"
```
- Connects to existing Pinchtab
- Manual container management
- Good for production

## ✅ Pre-Reload Checklist

Before reloading OpenCode, verify:

- [ ] `dist/index.js` exists (run `npm run build` if not)
- [ ] Docker is running (`docker ps` works)
- [ ] Config file is saved
- [ ] JSON syntax is valid (no trailing commas)
- [ ] Path to `dist/index.js` is absolute

## 🚀 Post-Reload Checklist

After reloading OpenCode, verify:

- [ ] No errors in OpenCode logs
- [ ] Tools appear in available tools list
- [ ] `pinchtab_health` responds successfully
- [ ] Can navigate to a test URL

## 🎯 Ready to Use

Once reloaded successfully, you can:

1. **Navigate websites:** "Go to https://example.com"
2. **Take screenshots:** "Screenshot the current page"
3. **Extract text:** "Read the page content"
4. **Interact:** "Click the login button"
5. **Fill forms:** "Fill the username field with 'test'"
6. **Execute JS:** "Run alert('Hello') on the page"

## 📞 Support

If issues persist:
1. Check logs: `journalctl -u opencode -f`
2. Test manually: `node /root/pinchtab-mcp-wrapper/dist/index.js`
3. Verify build: `cd /root/pinchtab-mcp-wrapper && npm test`

---

**Ready to reload OpenCode NOW!** 🚀
