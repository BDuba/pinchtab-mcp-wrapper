#!/bin/bash
# Wrapper script for pinchtab-mcp-wrapper with environment variables

export PINCHTAB_MODE=docker
export PINCHTAB_TOKEN=opencode-browser-token-secure
export PINCHTAB_DOCKER_IMAGE=pinchtab:local
export DEFAULT_SNAPSHOT_FORMAT=compact
export DEFAULT_MAX_TOKENS=2500
export SCREENSHOT_DEFAULT_DELIVERY=base64
export LOG_LEVEL=info

exec node /root/pinchtab-mcp-wrapper/dist/index.js
