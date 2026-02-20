.PHONY: build test lint clean install dev docker-build docker-up docker-down integration e2e

# Default target
all: build

# Install dependencies
install:
	npm install

# Build TypeScript
build:
	npm run build

# Development mode (watch)
dev:
	npm run dev

# Run all tests
test: test-unit

# Run unit tests
test-unit:
	npm run test:unit

# Run integration tests (requires Docker)
test-integration:
	docker-compose -f docker-compose.test.yml up -d
	@echo "Waiting for services to start..."
	@sleep 5
	-npm run test:integration
	docker-compose -f docker-compose.test.yml down

# Run E2E tests
test-e2e:
	npm run test:e2e

# Lint code
lint:
	npm run lint

# Fix lint issues
lint-fix:
	npm run lint:fix

# Clean build artifacts
clean:
	rm -rf dist/
	rm -rf node_modules/
	rm -rf coverage/

# Docker build
docker-build:
	docker build -t pinchtab-mcp-wrapper:latest .

# Docker compose up
docker-up:
	docker-compose up -d

# Docker compose down
docker-down:
	docker-compose down

# Run with external Pinchtab (development)
run-external: build
	PINCHTAB_MODE=external \
	PINCHTAB_URL=http://127.0.0.1:9867 \
	PINCHTAB_TOKEN=change-me \
	node dist/index.js

# Run with Docker sidecar (development)
run-docker: build
	docker run -d \
		--name pinchtab-dev \
		-p 127.0.0.1:9867:9867 \
		-e BRIDGE_TOKEN=dev-token \
		--security-opt seccomp=unconfined \
		-v "$(HOME)/.pinchtab:/data" \
		pinchtab/pinchtab:v0.4.0 || true
	@echo "Waiting for Pinchtab to start..."
	@sleep 3
	PINCHTAB_MODE=external \
	PINCHTAB_URL=http://127.0.0.1:9867 \
	PINCHTAB_TOKEN=dev-token \
	node dist/index.js

# Clean up development container
clean-dev:
	docker rm -f pinchtab-dev 2>/dev/null || true
