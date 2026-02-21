# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.2.0]: https://github.com/BDuba/pinchtab-mcp-wrapper/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/BDuba/pinchtab-mcp-wrapper/releases/tag/v0.1.0