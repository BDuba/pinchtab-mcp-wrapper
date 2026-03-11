#!/bin/bash
# HTTP MCP server for external services (LobeHub, etc.) - NO AUTH
# Uses existing pinchtab container (must be running)

export PINCHTAB_MODE=external
export PINCHTAB_URL=http://127.0.0.1:9868
export PINCHTAB_TOKEN=opencode-browser-token-secure
export DEFAULT_SNAPSHOT_FORMAT=compact
export DEFAULT_MAX_TOKENS=2500
export SCREENSHOT_DEFAULT_DELIVERY=base64
export LOG_LEVEL=info

# HTTP transport settings (no auth)
export MCP_TRANSPORT=streamable-http
export MCP_HTTP_PORT=3001
export MCP_HTTP_HOST=0.0.0.0
export MCP_AUTH_TYPE=none

exec node /root/.pinchtab-mcp-wrapper/dist/index.js
