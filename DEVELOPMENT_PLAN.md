# Pinchtab MCP Wrapper

## Project Structure

```
.
├── src/
│   ├── index.ts              # Entry point, MCP stdio server setup
│   ├── config.ts             # Environment configuration
│   ├── logger.ts             # Stderr-only logger
│   ├── client/
│   │   ├── pinchtab-client.ts    # HTTP client for Pinchtab API
│   │   └── docker-manager.ts     # Docker container management (auto mode)
│   ├── tools/
│   │   ├── thin/             # 1:1 Pinchtab HTTP API tools
│   │   │   ├── health.ts
│   │   │   ├── tabs.ts
│   │   │   ├── navigate.ts
│   │   │   ├── snapshot.ts
│   │   │   ├── text.ts
│   │   │   ├── action.ts
│   │   │   ├── evaluate.ts
│   │   │   ├── lock.ts
│   │   │   └── screenshot.ts
│   │   └── macro/            # Token-saver macro tools
│   │       ├── read-page.ts
│   │       ├── list-interactives.ts
│   │       ├── observe-changes.ts
│   │       └── read-region.ts
│   ├── utils/
│   │   ├── schemas.ts        # Zod validation schemas
│   │   ├── errors.ts         # Error handling
│   │   └── s3-uploader.ts    # S3 screenshot upload
│   └── types/
│       └── index.ts          # TypeScript type definitions
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docker-compose.yml        # Integration test setup
├── Dockerfile                # Wrapper container (optional)
├── README.md
└── ADR-0001.md
```

## Development Plan

### Phase 1: Foundation (High Priority)
1. **Configuration & Setup**
   - Environment variables handling
   - TypeScript project setup
   - Logger (stderr only)

2. **MCP Server Core**
   - Stdio transport setup
   - Tool registration
   - Error handling

3. **Pinchtab HTTP Client**
   - Base HTTP client with auth
   - Health check
   - Request/response types

### Phase 2: Core Tools (High Priority)
1. **Thin Tools (1:1 with Pinchtab API)**
   - Tab management (list, open, close)
   - Navigation
   - Snapshot with all options
   - Text extraction
   - Actions (click, type, etc.)
   - JavaScript evaluation
   - Tab locking/unlocking
   - Screenshots

2. **Docker Integration**
   - Auto-start Pinchtab container
   - Health check waiting
   - Cleanup on exit

### Phase 3: Token Savers (Medium Priority)
1. **Macro Tools**
   - `read_page` → /text
   - `list_interactives` → compact snapshot
   - `observe_changes` → diff snapshot
   - `read_region` → selector-based snapshot

### Phase 4: Advanced Features (Medium Priority)
1. **Screenshot Handlers**
   - Base64 encoding
   - S3 upload
   - File output

2. **Concurrency**
   - Per-tab async mutex
   - Request cancellation

### Phase 5: Testing (Medium Priority)
1. **Unit Tests**
   - Schema validation
   - Error handling
   - Parameter mapping

2. **Integration Tests**
   - Docker Compose setup
   - Real Pinchtab testing
   - S3 testing with MinIO

3. **E2E Tests**
   - MCP client harness
   - Full workflow testing

### Phase 6: Polish (Low Priority)
1. **Build & CI**
   - Makefile
   - GitHub Actions
   - npm publishing

2. **Documentation**
   - API documentation
   - Examples

## Implementation Notes

### Environment Variables
- All configuration via env vars
- Sensible defaults for token efficiency
- Security-first (no tokens in logs)

### Error Handling
- Pinchtab errors → MCP error responses
- Network timeouts
- Invalid parameters (Zod validation)

### Security
- Bearer token auth
- Loopback-only binding
- State directory secrets

### Token Efficiency
- Default to compact format
- Interactive-only snapshots
- Text-first reading
- Configurable maxTokens
