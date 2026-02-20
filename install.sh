#!/bin/bash
# One-line installer for pinchtab-mcp-wrapper
# Usage: curl -fsSL https://raw.githubusercontent.com/yourusername/pinchtab-mcp-wrapper/main/install.sh | bash

set -e

echo "🦀 Installing Pinchtab MCP Wrapper for OpenCode..."

# Configuration
INSTALL_DIR="${HOME}/.pinchtab-mcp-wrapper"
CONFIG_DIR="${HOME}/.config/opencode"
TOKEN="${PINCHTAB_TOKEN:-opencode-browser-token-secure}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check dependencies
echo "📋 Checking dependencies..."

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All dependencies found${NC}"

# Clone repository or use local copy
echo "📥 Downloading pinchtab-mcp-wrapper..."
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}⚠️  Directory $INSTALL_DIR already exists. Updating...${NC}"
    cd "$INSTALL_DIR"
    git pull 2>/dev/null || true
else
    # Try to clone from GitHub
    if git clone https://github.com/pinchtab/pinchtab-mcp-wrapper.git "$INSTALL_DIR" 2>/dev/null; then
        echo -e "${GREEN}✅ Cloned from GitHub${NC}"
    elif [ -d "$(dirname "$0")/.git" ] || [ -f "$(dirname "$0")/package.json" ]; then
        # Running from local copy (e.g., from opencode)
        echo -e "${YELLOW}📁 Using local copy...${NC}"
        mkdir -p "$INSTALL_DIR"
        cp -r "$(dirname "$0")"/* "$INSTALL_DIR/"
    else
        echo -e "${RED}❌ Could not download pinchtab-mcp-wrapper${NC}"
        echo "   Please clone manually: git clone <repository-url>"
        exit 1
    fi
    cd "$INSTALL_DIR"
fi

# Install dependencies and build
echo "🔧 Building project..."
npm install
npm run build

# Build Docker image
echo "🐳 Building Docker image..."
docker build -f pinchtab.Dockerfile -t pinchtab:local .

# Create wrapper script
echo "📝 Creating wrapper script..."
cat > "$INSTALL_DIR/run-mcp.sh" << 'EOF'
#!/bin/bash
# Wrapper script for pinchtab-mcp-wrapper with environment variables

export PINCHTAB_MODE=docker
export PINCHTAB_TOKEN="${PINCHTAB_TOKEN:-opencode-browser-token-secure}"
export PINCHTAB_DOCKER_IMAGE=pinchtab:local
export DEFAULT_SNAPSHOT_FORMAT=compact
export DEFAULT_MAX_TOKENS=2500
export SCREENSHOT_DEFAULT_DELIVERY=base64
export LOG_LEVEL=info

exec node "$(dirname "$0")/dist/index.js"
EOF
chmod +x "$INSTALL_DIR/run-mcp.sh"

# Create opencode config
echo "⚙️  Configuring OpenCode..."
mkdir -p "$CONFIG_DIR"

if [ -f "$CONFIG_DIR/opencode.json" ]; then
    echo -e "${YELLOW}⚠️  OpenCode config already exists. Creating backup...${NC}"
    cp "$CONFIG_DIR/opencode.json" "$CONFIG_DIR/opencode.json.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Check if pinchtab is already configured
    if grep -q '"pinchtab"' "$CONFIG_DIR/opencode.json"; then
        echo -e "${GREEN}✅ Pinchtab already configured in OpenCode${NC}"
    else
        echo "📝 Adding pinchtab to existing config..."
        # This is a simple approach - for complex configs, manual editing may be needed
        echo -e "${YELLOW}⚠️  Please manually add pinchtab configuration to your opencode.json:${NC}"
        echo ""
        cat << 'CONFIG'
"mcp": {
  "pinchtab": {
    "type": "local",
    "command": ["INSTALL_DIR_PLACEHOLDER/run-mcp.sh"],
    "enabled": true
  }
}
CONFIG
        echo ""
        echo -e "${YELLOW}   Replace INSTALL_DIR_PLACEHOLDER with: $INSTALL_DIR${NC}"
    fi
else
    # Create new config
    cat > "$CONFIG_DIR/opencode.json" << EOF
{
  "\$schema": "https://opencode.ai/config.json",
  "mcp": {
    "pinchtab": {
      "type": "local",
      "command": ["$INSTALL_DIR/run-mcp.sh"],
      "enabled": true
    }
  }
}
EOF
    echo -e "${GREEN}✅ Created new OpenCode config${NC}"
fi

# Create AGENTS.md
echo "📝 Creating agent instructions..."
cat > "$CONFIG_DIR/AGENTS.md" << 'EOF'
# Agent Instructions

## Default Browser Tool

When the user asks to open a website, take a screenshot, extract text, or perform any browser-related actions, **ALWAYS use pinchtab MCP tools by default**.

Do NOT use playwright or other browser tools unless explicitly requested.

### Preferred pinchtab workflow:

1. For opening a website:
   - Use `pinchtab_tab_open` to create a new tab
   - Use `pinchtab_navigate` if needed

2. For taking screenshots:
   - Use `pinchtab_screenshot` with `delivery: "base64"`
   - Default quality: 80

3. For extracting text:
   - Use `pinchtab_read_page` or `pinchtab_text`

4. For interacting with elements:
   - Use `pinchtab_snapshot` to get element refs
   - Use `pinchtab_action` to click/type

### Example commands:

User: "Открой https://mts.ru и сделай скриншот"
- Open tab with `pinchtab_tab_open` {"url": "https://mts.ru"}
- Take screenshot with `pinchtab_screenshot`

User: "Покажи текст страницы"
- Use `pinchtab_read_page` on the current tab

User: "Нажми на кнопку"
- First use `pinchtab_snapshot` to find element ref
- Then use `pinchtab_action` with the ref
EOF

echo ""
echo -e "${GREEN}✅ Installation complete!${NC}"
echo ""
echo "📍 Installation directory: $INSTALL_DIR"
echo "⚙️  Configuration: $CONFIG_DIR/opencode.json"
echo ""
echo -e "${YELLOW}🚀 Next steps:${NC}"
echo "   1. Restart OpenCode completely"
echo "   2. Run '/status' to verify pinchtab is working"
echo "   3. Try: 'открой https://example.com и сделай скриншот'"
echo ""
echo -e "${YELLOW}📖 Available commands:${NC}"
echo "   pinchtab_tab_open    - Open a new tab"
echo "   pinchtab_screenshot  - Take a screenshot"
echo "   pinchtab_snapshot    - Get page structure"
echo "   pinchtab_text        - Extract page text"
echo "   pinchtab_action      - Click, type, etc."
echo ""
echo -e "${YELLOW}🔧 To customize:${NC}"
echo "   Edit $INSTALL_DIR/run-mcp.sh to change environment variables"
echo "   Edit $CONFIG_DIR/opencode.json to add more MCP servers"
echo ""
