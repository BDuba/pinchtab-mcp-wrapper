#!/bin/bash
export PINCHTAB_MODE=docker
export PINCHTAB_TOKEN=opencode-browser-token-secure
export PINCHTAB_DOCKER_IMAGE=pinchtab:local
export MCP_TRANSPORT=streamable-http
export MCP_HTTP_PORT=3001
export MCP_HTTP_HOST=0.0.0.0
export MCP_AUTH_TYPE=none
export LOG_LEVEL=info
exec node /root/.pinchtab-mcp-wrapper/dist/index.js
