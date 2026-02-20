# Multi-stage build for Pinchtab server
# Pinchtab is a Go binary that controls Chrome via HTTP API

# Stage 1: Build Pinchtab binary
FROM golang:1.24-alpine AS builder

WORKDIR /build

# Install git for fetching dependencies
RUN apk add --no-cache git

# Clone and build pinchtab with GOTOOLCHAIN to auto-download required Go version
ENV GOTOOLCHAIN=auto
RUN go install github.com/pinchtab/pinchtab@latest

# Stage 2: Runtime with Chrome
FROM alpine:3.19

WORKDIR /app

# Install Chromium and dependencies
RUN apk add --no-cache \
    chromium \
    chromium-chromedriver \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Copy pinchtab binary from builder
COPY --from=builder /go/bin/pinchtab /usr/local/bin/pinchtab

# Create data directory for persistent state
RUN mkdir -p /data/chrome-profile

# Environment variables
ENV BRIDGE_PORT=9867 \
    BRIDGE_BIND=0.0.0.0 \
    BRIDGE_TOKEN="" \
    BRIDGE_HEADLESS=true \
    BRIDGE_STATE_DIR=/data \
    BRIDGE_PROFILE=/data/chrome-profile \
    CHROME_BIN=/usr/bin/chromium-browser

# Expose the HTTP API port
EXPOSE 9867

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["pinchtab"]
