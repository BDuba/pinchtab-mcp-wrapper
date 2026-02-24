# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.1] - 2026-02-24

### Added

- **Pinchtab v0.6.3 support** - Updated default Docker image and install script
- **New `pinchtab_upload` MCP tool** - File upload support (Pinchtab v0.6.2 feature)
  - Upload files to `<input type="file">` elements
  - Supports local file paths, base64 encoded data, or data URLs
  - Handles single and multiple file uploads
  - Use with `selector` (CSS) or `ref` (element reference)
  - Example: `pinchtab_upload({tabId: "...", files: [{path: "/tmp/file.pdf"}], selector: "input[type=file]"})`

### Changed

- Updated Pinchtab Docker image from v0.6.1 to v0.6.3
- Updated install.sh to download Pinchtab v0.6.3 binary

## [0.5.0] - 2026-02-24

### Added

- **Streamable HTTP transport support** - New multi-transport architecture
  - Support for `stdio` (default), `streamable-http`, and `sse` transports
  - HTTP mode enables cloud deployments and remote AI agent access
  - Bearer and API-key authentication for HTTP transports
  - Session management with stateful/stateless modes
  - CORS support for web-based clients
  - Health check endpoint at `/health`
  
- **New transport layer architecture**
  - Pluggable transport system with `TransportFactory`
  - `TransportConfig` for unified configuration
  - `StreamableHTTPTransport` implementing MCP Streamable HTTP spec
  - `StdioTransport` wrapper for backward compatibility
  
- **Enhanced configuration**
  - New environment variables for HTTP mode:
    - `MCP_TRANSPORT` - Transport type selection
    - `MCP_HTTP_PORT`, `MCP_HTTP_HOST` - HTTP server settings
    - `MCP_AUTH_TYPE`, `MCP_AUTH_TOKEN` - Authentication
    - `MCP_ALLOWED_ORIGINS` - CORS configuration
    - `MCP_ENABLE_SESSIONS`, `MCP_SESSION_TIMEOUT` - Session management
  
- **ADR documentation** - Architecture Decision Records
  - ADR-001: Streamable HTTP transport adoption
  
- **Testing improvements**
  - HTTP mode integration tests
  - E2E tests for Streamable HTTP transport
  - GitHub Actions jobs for HTTP transport testing
  - New npm scripts: `start:http`, `test:integration:http`, `test:e2e:http`

### Changed

- **Updated MCP SDK** from v1.0.0 to v1.9.0 with Streamable HTTP support
- **Refactored server initialization** to support async transport creation
- **Version bump** to 0.5.0

## [0.4.0] - 2026-02-22

### Fixed
- **CI/CD pipeline fully operational** - All GitHub Actions workflows now pass
  - Added missing `package-lock.json` for reproducible builds
  - Fixed ESLint configuration with `typescript-eslint`
  - Resolved all linting errors across the codebase
  - Updated Docker Compose to v2 syntax
  - Fixed integration test compilation and execution
  - Updated Pinchtab Docker image to v0.6.1
  - Added health check polling for service readiness
  - Fixed test file discovery in CI environment

### Changed
- **Code quality improvements**
  - Fixed `no-empty`, `no-unused-vars`, `no-var-requires` ESLint errors
  - Replaced `require('crypto')` with ESM imports
  - Added proper type annotations for mock functions
  - Updated all source files to follow consistent coding standards

## [0.3.0] - 2026-02-22

### Added
- **ESLint integration** with TypeScript support
- **Comprehensive test suite** with unit and integration tests
- **Automated CI/CD** with GitHub Actions for Node.js 18.x and 20.x

### Fixed
- **Dependency management** - Added `typescript-eslint` for proper linting
- **Build process** - Fixed TypeScript compilation for test files

## [0.2.0] - 2026-02-21

### Added
- **New `pinchtab_download` MCP tool** for downloading files using browser session
  - Preserves cookies, authentication, and stealth mode
  - Supports output formats: `file` (save to disk), `base64` (JSON), `raw` (binary)
  - Perfect for downloading images, PDFs, CSV exports from authenticated sites
- **Pinchtab 0.6.1 support** with all new API endpoints
- **Automatic multi-agent configuration** for OpenCode, Claude Code, Cursor, and Zed
- **Screenshot file delivery** with OS-specific directories and auto-creation

### Changed
- Updated install.sh to download Pinchtab v0.6.1 binary
- Improved error handling and logging in MCP server
- Enhanced configuration merging for existing AI agent setups
- Updated documentation with comprehensive examples and use cases

### Fixed
- Installation script issues and fallback logic
- Docker build compatibility improvements
- Configuration file backup and merge procedures

## [0.1.0] - 2026-02-19

### Added
- Initial release of Pinchtab MCP Wrapper
- Full support for Pinchtab v0.5.1 API
- Thin tools: health, tabs, navigate, snapshot, text, action, evaluate, lock, screenshot
- Macro tools: read-page, list-interactives, observe-changes, read-region
- Docker and external mode support
- One-line installation script
- OpenCode integration with agent instructions
- Basic documentation and examples

[0.5.1]: https://github.com/BDuba/pinchtab-mcp-wrapper/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/BDuba/pinchtab-mcp-wrapper/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/BDuba/pinchtab-mcp-wrapper/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/BDuba/pinchtab-mcp-wrapper/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/BDuba/pinchtab-mcp-wrapper/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/BDuba/pinchtab-mcp-wrapper/releases/tag/v0.1.0