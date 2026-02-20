# Troubleshooting Guide

This guide helps you resolve common issues with pinchtab-mcp-wrapper installation and usage.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Docker Issues](#docker-issues)
- [macOS-Specific Issues](#macos-specific-issues)
- [Connection Issues](#connection-issues)
- [Mode Switching](#mode-switching)
- [Getting Help](#getting-help)

---

## Installation Issues

### "Docker not found" during installation

**Problem:** The installer cannot find Docker even though it's installed.

**Solutions:**

1. **For macOS with Homebrew:**
   ```bash
   export DOCKER_PATH=/opt/homebrew/bin/docker
   ./install.sh
   ```

2. **For macOS with OrbStack:**
   ```bash
   export DOCKER_PATH=/Applications/OrbStack.app/Contents/MacOS/../bin/docker
   ./install.sh
   ```

3. **Use external mode (no Docker required):**
   ```bash
   export PINCHTAB_MODE=external
   ./install.sh
   ```

### "Failed to download Pinchtab binary"

**Problem:** The installer cannot download the pinchtab binary.

**Solutions:**

1. Check your internet connection
2. Try manual download:
   ```bash
   # Detect your architecture
   ARCH=$(uname -m)
   OS=$(uname -s | tr '[:upper:]' '[:lower:]')
   
   # Download manually
   curl -fsSL -o /tmp/pinchtab.tar.gz \
     "https://github.com/pinchtab/pinchtab/releases/download/v0.5.1/pinchtab-${OS}-${ARCH}.tar.gz"
   
   # Extract
   mkdir -p ~/.pinchtab-mcp-wrapper/bin
   tar -xzf /tmp/pinchtab.tar.gz -C ~/.pinchtab-mcp-wrapper/bin
   chmod +x ~/.pinchtab-mcp-wrapper/bin/pinchtab
   ```

### Git clone hangs in non-TTY environment

**Problem:** Installation script hangs when running in CI/CD or automated environments.

**Solution:** The installer now sets non-interactive git flags automatically. If you're using an older version:

```bash
export GIT_TERMINAL_PROMPT=0
export GIT_ASKPASS=/bin/false
./install.sh
```

---

## Docker Issues

### "Cannot connect to the Docker daemon"

**Problem:** Docker is installed but not running or not accessible.

**Solutions:**

1. **Start Docker:**
   ```bash
   # macOS
   open -a Docker
   
   # Linux
   sudo systemctl start docker
   ```

2. **Check permissions (Linux):**
   ```bash
   sudo usermod -aG docker $USER
   # Log out and log back in
   ```

3. **Switch to external mode:**
   ```bash
   export PINCHTAB_MODE=external
   ./install.sh
   ```

### "Docker build failed"

**Problem:** The Docker image build fails during installation.

**Solutions:**

1. Check Docker is running: `docker ps`
2. Check available disk space: `docker system df`
3. Clean up Docker cache: `docker builder prune`
4. Use external mode as fallback (automatic)

### "Image not found: pinchtab/pinchtab:v0.4.0"

**Problem:** Using an old version that references non-existent Docker image.

**Solution:** The issue has been fixed in the latest version. Update to v0.5.1:

```bash
cd ~/.pinchtab-mcp-wrapper
git pull
npm run build
```

---

## macOS-Specific Issues

### Docker Desktop vs Colima vs OrbStack

**Docker Desktop:**
- Full-featured, but heavier resource usage
- Install from: https://www.docker.com/products/docker-desktop

**Colima (lightweight alternative):**
```bash
brew install colima
colima start
export DOCKER_PATH=/opt/homebrew/bin/docker
```

**OrbStack (recommended for macOS):**
- Fast, lightweight Docker alternative
- Install from: https://orbstack.dev
- Docker is available at: `/Applications/OrbStack.app/Contents/MacOS/../bin/docker`

### Rosetta issues on Apple Silicon

**Problem:** Architecture mismatch errors on M1/M2/M3 Macs.

**Solution:** The installer automatically detects your architecture. If you see issues:

```bash
# Check architecture
uname -m  # Should show: arm64

# Force specific architecture
export PINCHTAB_ARCH=darwin-arm64
./install.sh
```

### Permission denied on install.sh

**Problem:** Cannot execute the install script.

**Solution:**
```bash
chmod +x install.sh
./install.sh
```

---

## Connection Issues

### "Connection closed" or "MCP error -32000"

**Problem:** The MCP server cannot connect to Pinchtab.

**Solutions:**

1. **Check if Pinchtab is running (Docker mode):**
   ```bash
   docker ps | grep pinchtab
   docker logs pinchtab
   ```

2. **Check if Pinchtab is running (External mode):**
   ```bash
   curl http://127.0.0.1:9867/health
   ```

3. **Restart the wrapper:**
   ```bash
   # Kill any running instances
   pkill -f "pinchtab-mcp-wrapper"
   
   # Restart your AI agent
   ```

### "Authentication failed" (401 error)

**Problem:** The token doesn't match between wrapper and Pinchtab.

**Solutions:**

1. Check your token configuration:
   ```bash
   echo $PINCHTAB_TOKEN
   ```

2. For Docker mode, the token is auto-generated. Check:
   ```bash
   cat ~/.pinchtab-mcp-wrapper/run-mcp.sh | grep PINCHTAB_TOKEN
   ```

3. Regenerate with matching token:
   ```bash
   export PINCHTAB_TOKEN=$(openssl rand -hex 32)
   ./install.sh
   ```

### Health check timeout

**Problem:** Pinchtab takes too long to start.

**Solutions:**

1. Increase timeout (Docker mode):
   ```bash
   export PINCHTAB_HEALTH_TIMEOUT=120
   ```

2. Check system resources:
   ```bash
   # macOS
   top
   
   # Check disk space
   df -h
   ```

3. Try external mode for faster startup:
   ```bash
   export PINCHTAB_MODE=external
   ./install.sh
   ```

---

## Mode Switching

### Switch from Docker to External mode

```bash
# Edit the wrapper script
nano ~/.pinchtab-mcp-wrapper/run-mcp.sh

# Change:
export PINCHTAB_MODE=external
export PINCHTAB_URL=http://127.0.0.1:9867

# Download and start pinchtab binary manually
mkdir -p ~/.pinchtab-mcp-wrapper/bin
curl -fsSL https://github.com/pinchtab/pinchtab/releases/download/v0.5.1/pinchtab-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m).tar.gz | tar -xz -C ~/.pinchtab-mcp-wrapper/bin
~/.pinchtab-mcp-wrapper/bin/pinchtab &
```

### Switch from External to Docker mode

```bash
# Stop external pinchtab
pkill pinchtab

# Edit the wrapper script
nano ~/.pinchtab-mcp-wrapper/run-mcp.sh

# Change:
export PINCHTAB_MODE=docker
export PINCHTAB_DOCKER_IMAGE=pinchtab:local

# Build Docker image if not exists
cd ~/.pinchtab-mcp-wrapper
docker build -f pinchtab.Dockerfile -t pinchtab:local .
```

### Check current mode

```bash
# Check environment variables
cat ~/.pinchtab-mcp-wrapper/run-mcp.sh | grep PINCHTAB_MODE

# Or check running processes
ps aux | grep -E "(pinchtab|docker)"
```

---

## Getting Help

### Before asking for help

1. **Check the logs:**
   ```bash
   # For Docker mode
   docker logs pinchtab
   
   # For external mode
   ~/.pinchtab-mcp-wrapper/bin/pinchtab 2>&1 | tee /tmp/pinchtab.log
   ```

2. **Verify your setup:**
   ```bash
   # Check versions
   node --version  # Should be 18+
   npm --version
   docker --version  # If using Docker
   
   # Check installation
   ls -la ~/.pinchtab-mcp-wrapper/
   ls -la ~/.pinchtab-mcp-wrapper/dist/
   ```

3. **Test connectivity:**
   ```bash
   # For Docker mode
   docker exec pinchtab wget -qO- http://localhost:9867/health
   
   # For external mode
   curl http://127.0.0.1:9867/health
   ```

### Where to get help

- **GitHub Issues:** https://github.com/pinchtab/pinchtab-mcp-wrapper/issues
- **Feature Requests:** Create a new issue with the `enhancement` label
- **Bug Reports:** Include:
  - Your OS and version
  - Node.js version (`node --version`)
  - Installation mode (docker/external)
  - Full error message
  - Steps to reproduce

### Debug mode

Enable debug logging for more information:

```bash
export LOG_LEVEL=debug
~/.pinchtab-mcp-wrapper/run-mcp.sh
```

---

## Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Docker not found | `export PINCHTAB_MODE=external` |
| Port already in use | `export PINCHTAB_PORT=9868` |
| Out of disk space | `docker system prune -a` |
| Slow startup | Switch to external mode |
| Permission denied | `chmod +x ~/.pinchtab-mcp-wrapper/run-mcp.sh` |
| Need to reset | `rm -rf ~/.pinchtab-mcp-wrapper && ./install.sh` |

---

## Still Having Issues?

If none of these solutions work:

1. Try a clean installation:
   ```bash
   rm -rf ~/.pinchtab-mcp-wrapper
   rm -f ~/.config/opencode/opencode.json.backup.*
   ./install.sh
   ```

2. Use the manual installation method (see README.md)

3. Create an issue with:
   - Full error output
   - Your environment details
   - Steps you've already tried
