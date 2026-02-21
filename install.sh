#!/bin/bash
# One-line installer for pinchtab-mcp-wrapper
# Usage: curl -fsSL https://raw.githubusercontent.com/pinchtab/pinchtab-mcp-wrapper/main/install.sh | bash

set -e

# Non-TTY git settings to prevent interactive prompts
export GIT_TERMINAL_PROMPT=0
export GIT_ASKPASS=/bin/false

echo "🦀 Installing Pinchtab MCP Wrapper for OpenCode..."

# Configuration
INSTALL_DIR="${HOME}/.pinchtab-mcp-wrapper"
CONFIG_DIR="${HOME}/.config/opencode"
TOKEN="${PINCHTAB_TOKEN:-opencode-browser-token-secure}"
PINCHTAB_VERSION="${PINCHTAB_VERSION:-v0.5.1}"

# Colors
BLUE='\033[0;34m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to find Docker binary
find_docker() {
    local docker_paths=(
        "/opt/homebrew/bin/docker"
        "/usr/local/bin/docker"
        "/Applications/OrbStack.app/Contents/MacOS/../bin/docker"
        "/Applications/Docker.app/Contents/Resources/bin/docker"
        "$HOME/.docker/bin/docker"
        "/usr/bin/docker"
    )
    
    if [ -n "$DOCKER_PATH" ] && [ -x "$DOCKER_PATH" ]; then
        echo "$DOCKER_PATH"
        return 0
    fi
    
    for path in "${docker_paths[@]}"; do
        if [ -x "$path" ]; then
            echo "$path"
            return 0
        fi
    done
    
    if command -v docker &> /dev/null; then
        command -v docker
        return 0
    fi
    
    return 1
}

# Function to detect architecture for binary download
detect_arch() {
    local arch=$(uname -m)
    local os=$(uname -s | tr '[:upper:]' '[:lower:]')
    
    case "$arch" in
        x86_64|amd64)
            echo "${os}-amd64"
            ;;
        arm64|aarch64)
            echo "${os}-arm64"
            ;;
        *)
            echo "${os}-${arch}"
            ;;
    esac
}

# Function to download pinchtab binary
download_pinchtab_binary() {
    local arch=$(detect_arch)
    local download_url="https://github.com/pinchtab/pinchtab/releases/download/${PINCHTAB_VERSION}/pinchtab-${arch}.tar.gz"
    local bin_dir="$INSTALL_DIR/bin"
    
    echo "📥 Downloading Pinchtab binary for ${arch}..."
    
    mkdir -p "$bin_dir"
    
    if curl -fsSL --connect-timeout 30 "$download_url" | tar -xz -C "$bin_dir" 2>/dev/null; then
        chmod +x "$bin_dir/pinchtab"
        echo -e "${GREEN}✅ Pinchtab binary downloaded to ${bin_dir}/pinchtab${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Failed to download Pinchtab binary${NC}"
        return 1
    fi
}

# Check dependencies
echo "📋 Checking dependencies..."

DOCKER_BIN=$(find_docker)
if [ -z "$DOCKER_BIN" ]; then
    echo -e "${YELLOW}⚠️  Docker not found - will use external mode with binary${NC}"
    USE_DOCKER=false
else
    echo -e "${GREEN}✅ Docker found: $DOCKER_BIN${NC}"
    USE_DOCKER=true
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

echo -e "${GREEN}✅ Core dependencies found${NC}"

# Clone repository or use local copy
echo "📥 Downloading pinchtab-mcp-wrapper..."
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}⚠️  Directory $INSTALL_DIR already exists. Updating...${NC}"
    cd "$INSTALL_DIR"
    git pull --depth 1 2>/dev/null || true
else
    if git clone --depth 1 https://github.com/pinchtab/pinchtab-mcp-wrapper.git "$INSTALL_DIR" 2>/dev/null; then
        echo -e "${GREEN}✅ Cloned from GitHub${NC}"
    elif [ -d "$(dirname "$0")/.git" ] || [ -f "$(dirname "$0")/package.json" ]; then
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

# Setup mode based on Docker availability
echo "📝 Creating wrapper script..."

if [ "$USE_DOCKER" = true ]; then
    echo "🐳 Building Docker image..."
    if "$DOCKER_BIN" build -f pinchtab.Dockerfile -t pinchtab:local . 2>/dev/null; then
        echo -e "${GREEN}✅ Docker image built successfully${NC}"
        
        cat > "$INSTALL_DIR/run-mcp.sh" << EOF
#!/bin/bash
export PINCHTAB_MODE=\${PINCHTAB_MODE:-docker}
export PINCHTAB_TOKEN="\${PINCHTAB_TOKEN:-$TOKEN}"
export PINCHTAB_DOCKER_IMAGE=pinchtab:local
export DEFAULT_SNAPSHOT_FORMAT=compact
export DEFAULT_MAX_TOKENS=2500
export SCREENSHOT_DEFAULT_DELIVERY=base64
export LOG_LEVEL=info

exec node "\$(dirname "\$0")/dist/index.js"
EOF
    else
        echo -e "${YELLOW}⚠️  Docker build failed, falling back to external mode${NC}"
        USE_DOCKER=false
    fi
fi

if [ "$USE_DOCKER" = false ]; then
    echo "🔧 Setting up external mode..."
    download_pinchtab_binary || {
        echo -e "${RED}❌ Failed to setup Pinchtab${NC}"
        echo "   Please install Docker or download pinchtab binary manually"
        exit 1
    }
    
    cat > "$INSTALL_DIR/run-mcp.sh" << EOF
#!/bin/bash
export PINCHTAB_MODE=external
export PINCHTAB_URL=\${PINCHTAB_URL:-http://127.0.0.1:9867}
export PINCHTAB_TOKEN="\${PINCHTAB_TOKEN:-$TOKEN}"
export DEFAULT_SNAPSHOT_FORMAT=compact
export DEFAULT_MAX_TOKENS=2500
export SCREENSHOT_DEFAULT_DELIVERY=base64
export LOG_LEVEL=info

# Auto-start pinchtab if not running
if ! curl -s http://127.0.0.1:9867/health > /dev/null 2>&1; then
    echo "Starting Pinchtab server..." >&2
    \$(dirname "\$0")/bin/pinchtab &
    sleep 3
fi

exec node "\$(dirname "\$0")/dist/index.js"
EOF
fi

chmod +x "$INSTALL_DIR/run-mcp.sh"

# Create opencode config
echo "⚙️  Configuring OpenCode..."
mkdir -p "$CONFIG_DIR"

# Function to add pinchtab to config using Node.js
add_pinchtab_to_config() {
    local config_file="$1"
    local install_dir="$2"
    
    node << NODEEOF
const fs = require('fs');
const path = '$config_file';
const installDir = '$install_dir';

try {
    const content = fs.readFileSync(path, 'utf8');
    const config = JSON.parse(content);
    
    // Ensure mcp section exists
    if (!config.mcp) {
        config.mcp = {};
    }
    
    // Add pinchtab if not exists
    if (!config.mcp.pinchtab) {
        config.mcp.pinchtab = {
            type: "local",
            command: [installDir + "/run-mcp.sh"],
            enabled: true
        };
        
        fs.writeFileSync(path, JSON.stringify(config, null, 2));
        console.log("✅ Pinchtab automatically added to existing config");
    } else {
        console.log("✅ Pinchtab already configured");
    }
} catch (error) {
    console.error("❌ Error updating config:", error.message);
    process.exit(1);
}
NODEEOF
}

if [ -f "$CONFIG_DIR/opencode.json" ]; then
    echo -e "${YELLOW}⚠️  OpenCode config already exists. Creating backup...${NC}"
    cp "$CONFIG_DIR/opencode.json" "$CONFIG_DIR/opencode.json.backup.$(date +%Y%m%d_%H%M%S)"
    
    if grep -q '"pinchtab"' "$CONFIG_DIR/opencode.json"; then
        echo -e "${GREEN}✅ Pinchtab already configured in OpenCode${NC}"
    else
        echo "📝 Adding pinchtab to existing config..."
        if add_pinchtab_to_config "$CONFIG_DIR/opencode.json" "$INSTALL_DIR"; then
            echo -e "${GREEN}✅ Configuration updated successfully${NC}"
        else
            echo -e "${YELLOW}⚠️  Could not auto-update config. Please manually add:${NC}"
            echo "   $INSTALL_DIR/run-mcp.sh to your mcp servers"
        fi
    fi
else
    cat > "$CONFIG_DIR/opencode.json" << EOFCFG
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
EOFCFG
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

if [ "$USE_DOCKER" = true ]; then
    echo -e "${BLUE}ℹ️  Mode: Docker${NC}"
else
    echo -e "${YELLOW}ℹ️  Mode: External (using downloaded binary)${NC}"
fi

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

# Setup screenshots directory
setup_screenshots_dir() {
    local default_dir
    
    case "$(uname -s)" in
        Darwin*)
            default_dir="$HOME/Pictures/Screenshots"
            ;;
        MINGW*|CYGWIN*|MSYS*)
            default_dir="${USERPROFILE:-$HOME}/Pictures/Screenshots"
            ;;
        *)
            default_dir="${XDG_PICTURES_DIR:-$HOME/Pictures}/Screenshots"
            ;;
    esac
    
    mkdir -p "$default_dir"
    
    echo "export SCREENSHOTS_DIR=\"$default_dir\"" >> "$INSTALL_DIR/run-mcp.sh"
    
    echo -e "${GREEN}✅ Screenshots directory: $default_dir${NC}"
}

setup_screenshots_dir

# Configure other AI agents
echo "🤖 Checking for other AI agent configurations..."

# Claude Code (.mcp.json)
if [ -f "$HOME/.mcp.json" ] || [ -f ".mcp.json" ]; then
    echo "📁 Found Claude Code config"
    for config_file in "$HOME/.mcp.json" ".mcp.json"; do
        if [ -f "$config_file" ]; then
            if ! grep -q '"pinchtab"' "$config_file" 2>/dev/null; then
                echo "📝 Adding pinchtab to Claude Code config..."
                node << NODEEOF
const fs = require('fs');
const path = '$config_file';
const installDir = '$INSTALL_DIR';

try {
    const content = fs.readFileSync(path, 'utf8');
    const config = JSON.parse(content);
    
    if (!config.mcpServers) {
        config.mcpServers = {};
    }
    
    if (!config.mcpServers.pinchtab) {
        config.mcpServers.pinchtab = {
            command: "bash",
            args: [installDir + "/run-mcp.sh"]
        };
        
        fs.writeFileSync(path, JSON.stringify(config, null, 2));
        console.log("✅ Pinchtab added to Claude Code config");
    }
} catch (error) {
    console.error("❌ Error:", error.message);
}
NODEEOF
            fi
            break
        fi
    done
fi

# Cursor (settings.json)
CURSOR_CONFIG="$HOME/.config/Cursor/User/settings.json"
if [ -f "$CURSOR_CONFIG" ]; then
    echo "📁 Found Cursor config"
    if ! grep -q '"pinchtab"' "$CURSOR_CONFIG" 2>/dev/null; then
        echo "📝 Adding pinchtab to Cursor config..."
        node << NODEEOF
const fs = require('fs');
const path = '$CURSOR_CONFIG';
const installDir = '$INSTALL_DIR';

try {
    const content = fs.readFileSync(path, 'utf8');
    const config = JSON.parse(content);
    
    if (!config.mcpServers) {
        config.mcpServers = {};
    }
    
    if (!config.mcpServers.pinchtab) {
        config.mcpServers.pinchtab = {
            type: "stdio",
            command: "bash",
            args: [installDir + "/run-mcp.sh"]
        };
        
        fs.writeFileSync(path, JSON.stringify(config, null, 2));
        console.log("✅ Pinchtab added to Cursor config");
    }
} catch (error) {
    console.error("❌ Error:", error.message);
}
NODEEOF
    fi
fi

# Zed (settings.json)
ZED_CONFIG="$HOME/.config/zed/settings.json"
if [ -f "$ZED_CONFIG" ]; then
    echo "📁 Found Zed config"
    if ! grep -q '"pinchtab"' "$ZED_CONFIG" 2>/dev/null; then
        echo "📝 Adding pinchtab to Zed config..."
        node << NODEEOF
const fs = require('fs');
const path = '$ZED_CONFIG';
const installDir = '$INSTALL_DIR';

try {
    const content = fs.readFileSync(path, 'utf8');
    const config = JSON.parse(content);
    
    if (!config.context_servers) {
        config.context_servers = {};
    }
    
    if (!config.context_servers.pinchtab) {
        config.context_servers.pinchtab = {
            command: "bash",
            args: [installDir + "/run-mcp.sh"]
        };
        
        fs.writeFileSync(path, JSON.stringify(config, null, 2));
        console.log("✅ Pinchtab added to Zed config");
    }
} catch (error) {
    console.error("❌ Error:", error.message);
}
NODEEOF
    fi
fi
