#!/bin/bash
# HTTP MCP server with Docker mode - for opencode

export PINCHTAB_MODE=docker
export PINCHTAB_TOKEN=opencode-browser-token-secure
export PINCHTAB_DOCKER_IMAGE=pinchtab:local
export DEFAULT_SNAPSHOT_FORMAT=compact
export DEFAULT_MAX_TOKENS=2500
export SCREENSHOT_DEFAULT_DELIVERY=base64
export LOG_LEVEL=info

# HTTP transport settings
export MCP_TRANSPORT=streamable-http
export MCP_HTTP_PORT=3001
export MCP_HTTP_HOST=0.0.0.0
export MCP_AUTH_TYPE=none

exec node /root/.pinchtab-mcp-wrapper/dist/index.js
