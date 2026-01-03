#!/bin/bash
#
# Claude Archive Collector - Install/Update Script
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/claude-code-archive/main/packages/collector/scripts/install.sh | bash
#
# Or with custom install path:
#   curl -fsSL ... | INSTALL_DIR=/opt/collector bash
#

set -e

# Configuration
REPO="${REPO:-YOUR_ORG/claude-code-archive}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"
COLLECTOR_PATH="${INSTALL_DIR}/collector.cjs"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Check for Node.js
if ! command -v node &> /dev/null; then
    error "Node.js is required but not installed. Install it first: https://nodejs.org/"
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    error "Node.js 18 or higher required. Current: $(node -v)"
fi

# Create install directory
mkdir -p "$INSTALL_DIR"

# Download latest collector
info "Downloading latest collector..."
DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/collector-latest.cjs"

if curl -fsSL "$DOWNLOAD_URL" -o "${COLLECTOR_PATH}.tmp"; then
    mv "${COLLECTOR_PATH}.tmp" "$COLLECTOR_PATH"
    chmod +x "$COLLECTOR_PATH"
    info "Installed to: $COLLECTOR_PATH"
else
    error "Failed to download collector from: $DOWNLOAD_URL"
fi

# Show version
VERSION=$(head -5 "$COLLECTOR_PATH" | grep "v[0-9]" | sed 's/.*v\([0-9.]*\).*/\1/')
info "Version: ${VERSION:-unknown}"

# Check if in PATH
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    warn "Add $INSTALL_DIR to your PATH:"
    echo "  export PATH=\"\$PATH:$INSTALL_DIR\""
fi

# Show usage
echo ""
info "Usage:"
echo "  export CLAUDE_ARCHIVE_SERVER_URL=https://your-server.com"
echo "  export CLAUDE_ARCHIVE_API_KEY=your-api-key"
echo "  node $COLLECTOR_PATH sync"
echo ""
info "Cron job example (every 5 minutes):"
echo "  */5 * * * * CLAUDE_ARCHIVE_SERVER_URL=url CLAUDE_ARCHIVE_API_KEY=key node $COLLECTOR_PATH sync >> /tmp/collector.log 2>&1"
