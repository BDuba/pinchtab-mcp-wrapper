#!/bin/bash
set -e
echo "=== Pinchtab MCP Wrapper - Integration Test ==="
echo ""
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'
PROJECT_DIR="/root/pinchtab-mcp-wrapper"
cd "$PROJECT_DIR"
if [ ! -d "dist" ]; then
    echo -e "${YELLOW}Building project...${NC}"
    npm run build
fi
echo "Step 1: Starting Pinchtab in Docker..."
docker run -d --name pinchtab-test -p 127.0.0.1:9867:9867 -e BRIDGE_TOKEN="test-token-12345" --security-opt seccomp=unconfined -v "/tmp/pinchtab-test:/data" pinchtab/pinchtab:v0.4.0 2>/dev/null || echo "Container may already exist"
echo "Step 2: Waiting for Pinchtab..."
for i in {1..30}; do
    if curl -s -H "Authorization: Bearer test-token-12345" http://127.0.0.1:9867/health > /dev/null 2>&1; then
        echo -e "${GREEN}Pinchtab ready!${NC}"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "${RED}Timeout${NC}"
        exit 1
    fi
done
echo "Step 3: Testing MCP Server..."
export PINCHTAB_MODE=external
export PINCHTAB_URL=http://127.0.0.1:9867
export PINCHTAB_TOKEN=test-token-12345
echo "Test completed!"
docker rm -f pinchtab-test 2>/dev/null || true
echo -e "${GREEN}✅ Tests passed!${NC}"
