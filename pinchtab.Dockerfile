# Multi-stage build for Pinchtab server
# Pinchtab is a Go binary that controls Chrome via HTTP API

# Stage 1: Download Pinchtab binary
FROM alpine:3.19 AS builder

# Build arguments for architecture and version
ARG TARGETARCH
ARG TARGETOS=linux
ARG PINCHTAB_VERSION=v0.7.8

WORKDIR /build

# Install curl and ca-certificates for downloading
RUN apk add --no-cache curl ca-certificates

# Detect architecture and download appropriate binary
RUN set -e; \
    case "${TARGETARCH}" in \
        amd64) ARCH="amd64" ;; \
        arm64) ARCH="arm64" ;; \
        *) echo "Unsupported architecture: ${TARGETARCH}"; exit 1 ;; \
    esac; \
    echo "Downloading Pinchtab ${PINCHTAB_VERSION} for ${TARGETOS}-${ARCH}"; \
    curl -fsSL -o pinchtab \
        "https://github.com/pinchtab/pinchtab/releases/download/${PINCHTAB_VERSION}/pinchtab-${TARGETOS}-${ARCH}"; \
    chmod +x pinchtab

# Stage 2: Runtime with Chrome (Debian-based for glibc compatibility)
FROM debian:12-slim

WORKDIR /app

# Install Chromium, dependencies, and dumb-init
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    chromium-driver \
    fonts-liberation \
    fontconfig \
    libfreetype6 \
    libharfbuzz0b \
    ca-certificates \
    curl \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Copy pinchtab binary from builder
COPY --from=builder /build/pinchtab /usr/local/bin/pinchtab

# Create data directory for persistent state
RUN mkdir -p /data/chrome-profile

# Environment variables
ENV BRIDGE_PORT=9867 \
    BRIDGE_BIND=0.0.0.0 \
    BRIDGE_TOKEN="" \
    BRIDGE_HEADLESS=true \
    BRIDGE_STATE_DIR=/data \
    BRIDGE_PROFILE=/data/chrome-profile \
    CHROME_BIN=/usr/bin/chromium

# Expose the HTTP API port
EXPOSE 9867

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["pinchtab"]
